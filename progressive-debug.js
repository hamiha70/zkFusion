const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔧 PROGRESSIVE DEBUGGING: Simple → Complex");
  console.log("=" .repeat(60));
  
  const ROUTER_ADDRESS = ethers.getAddress("0x111111125421ca6dc452d289314280a0f8842a65");
  const WETH_ADDRESS = process.env.WETH_ADDRESS || "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  try {
    // Get signers
    const [owner, bidder1] = await ethers.getSigners();
    
    // Connect to contracts
    const routerABI = [
      "function hashOrder((uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order) external view returns (bytes32 orderHash)",
      "function fillOrderArgs((uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes32 r, bytes32 vs, uint256 amount, uint256 takerTraits, bytes args) external payable returns (uint256 makingAmount, uint256 takingAmount, bytes32 orderHash)"
    ];
    
    const erc20ABI = [
      "function balanceOf(address account) external view returns (uint256)",
      "function allowance(address owner, address spender) external view returns (uint256)",
      "function approve(address spender, uint256 amount) external returns (bool)"
    ];
    
    const router = await ethers.getContractAt(routerABI, ROUTER_ADDRESS);
    const weth = await ethers.getContractAt(erc20ABI, WETH_ADDRESS);
    const usdc = await ethers.getContractAt(erc20ABI, USDC_ADDRESS);
    
    // Set up allowances
    console.log("📝 Setting up allowances...");
    await weth.connect(bidder1).approve(ROUTER_ADDRESS, ethers.parseEther("100"));
    await usdc.connect(owner).approve(ROUTER_ADDRESS, ethers.parseUnits("200000", 6));
    console.log("✅ Allowances set");
    
    // EIP-712 setup (corrected)
    const domain = {
      name: '1inch Aggregation Router',
      version: '6',
      chainId: 42161, // Contract's preferred chainId
      verifyingContract: ROUTER_ADDRESS
    };
    
    const types = {
      Order: [
        { name: 'salt', type: 'uint256' },
        { name: 'maker', type: 'address' },
        { name: 'receiver', type: 'address' },
        { name: 'makerAsset', type: 'address' },
        { name: 'takerAsset', type: 'address' },
        { name: 'makingAmount', type: 'uint256' },
        { name: 'takingAmount', type: 'uint256' },
        { name: 'makerTraits', type: 'uint256' },
      ]
    };
    
    // STEP 1: Test smallest possible order
    console.log("\n🧪 STEP 1: Minimal Order (0.001 WETH)");
    console.log("-".repeat(50));
    
    const minimalOrder = {
      salt: 1n,
      maker: bidder1.address,
      receiver: ethers.ZeroAddress,
      makerAsset: WETH_ADDRESS,
      takerAsset: USDC_ADDRESS,
      makingAmount: ethers.parseEther("0.001"), // 0.001 WETH
      takingAmount: ethers.parseUnits("1.8", 6), // 1.8 USDC
      makerTraits: 0n
    };
    
    await testOrder("Minimal", minimalOrder, ethers.parseEther("0.001"));
    
    // STEP 2: Test normal-sized order
    console.log("\n🧪 STEP 2: Normal Order (1 WETH)");
    console.log("-".repeat(50));
    
    const normalOrder = {
      salt: 2n,
      maker: bidder1.address,
      receiver: ethers.ZeroAddress,
      makerAsset: WETH_ADDRESS,
      takerAsset: USDC_ADDRESS,
      makingAmount: ethers.parseEther("1"), // 1 WETH
      takingAmount: ethers.parseUnits("1800", 6), // 1800 USDC
      makerTraits: 0n
    };
    
    await testOrder("Normal", normalOrder, ethers.parseEther("1"));
    
    // STEP 3: Test large order (like our main test)
    console.log("\n🧪 STEP 3: Large Order (100 WETH)");
    console.log("-".repeat(50));
    
    const largeOrder = {
      salt: 3n,
      maker: bidder1.address,
      receiver: ethers.ZeroAddress,
      makerAsset: WETH_ADDRESS,
      takerAsset: USDC_ADDRESS,
      makingAmount: ethers.parseEther("100"), // 100 WETH
      takingAmount: ethers.parseUnits("180000", 6), // 180,000 USDC
      makerTraits: 0n
    };
    
    await testOrder("Large", largeOrder, ethers.parseEther("100"));
    
    async function testOrder(name, order, fillAmount) {
      try {
        // Generate signature
        const signature = await bidder1.signTypedData(domain, types, order);
        const { r, yParityAndS: vs } = ethers.Signature.from(signature);
        
        // Test the order
        const result = await router.connect(owner).fillOrderArgs.staticCall(
          order,
          r,
          vs,
          fillAmount,
          0n, // No taker traits
          "0x" // No args
        );
        
        console.log(`✅ ${name} order SUCCESS!`);
        console.log(`   Making: ${ethers.formatEther(result[0])}`);
        console.log(`   Taking: ${ethers.formatUnits(result[1], 6)}`);
        console.log(`   Hash: ${result[2]}`);
        
        return true;
        
      } catch (error) {
        console.log(`❌ ${name} order FAILED: ${error.message}`);
        if (error.data) {
          console.log(`   Error data: ${error.data}`);
          
          // Try to decode
          try {
            const errorInterface = new ethers.Interface([
              "error BadSignature()",
              "error InsufficientBalance()",
              "error InsufficientAllowance()",
              "error OrderExpired()",
              "error InvalidOrder()",
              "error OrderAlreadyFilled()"
            ]);
            
            const decodedError = errorInterface.parseError(error.data);
            console.log(`   🎯 DECODED: ${decodedError.name}`);
          } catch (decodeError) {
            console.log(`   ⚠️ Could not decode error`);
          }
        }
        
        return false;
      }
    }
    
  } catch (error) {
    console.error("❌ Error in progressive debug:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 