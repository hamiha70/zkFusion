const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔧 TESTING WITH CONTRACT'S PREFERRED CHAINID");
  console.log("=" .repeat(60));
  
  const ROUTER_ADDRESS = ethers.getAddress("0x111111125421ca6dc452d289314280a0f8842a65");
  const WETH_ADDRESS = process.env.WETH_ADDRESS || "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  console.log(`🎯 Router: ${ROUTER_ADDRESS}`);
  console.log(`💰 WETH: ${WETH_ADDRESS}`);
  console.log(`💵 USDC: ${USDC_ADDRESS}`);
  
  try {
    // Get signers and network info
    const [owner, bidder1] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    
    console.log(`\n📊 NETWORK vs CONTRACT CHAINID:`);
    console.log(`  Network ChainId: ${network.chainId} (Hardhat fork)`);
    console.log(`  Contract ChainId: 42161 (Contract's preference - USING THIS)`);
    
    // Connect to router
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
    
    // Set up token allowances first
    console.log(`\n📝 Setting up token allowances...`);
    await weth.connect(bidder1).approve(ROUTER_ADDRESS, ethers.parseEther("100"));
    await usdc.connect(owner).approve(ROUTER_ADDRESS, ethers.parseUnits("200000", 6));
    console.log(`✅ Allowances set`);
    
    // Create a test order
    const testOrder = {
      salt: 98765n,
      maker: bidder1.address,
      receiver: ethers.ZeroAddress,
      makerAsset: WETH_ADDRESS,
      takerAsset: USDC_ADDRESS,
      makingAmount: ethers.parseEther("1"), // 1 WETH
      takingAmount: ethers.parseUnits("1800", 6), // 1800 USDC
      makerTraits: 0n
    };
    
    console.log(`\n📊 TEST ORDER:`);
    console.log(`  Salt: ${testOrder.salt}`);
    console.log(`  Maker: ${testOrder.maker}`);
    console.log(`  Making: ${ethers.formatEther(testOrder.makingAmount)} WETH`);
    console.log(`  Taking: ${ethers.formatUnits(testOrder.takingAmount, 6)} USDC`);
    
    // Generate order hash
    const orderHash = await router.hashOrder(testOrder);
    console.log(`  Order Hash: ${orderHash}`);
    
    // Use CONTRACT'S preferred EIP-712 domain (chainId 42161)
    const domain = {
      name: '1inch Aggregation Router',
      version: '6',
      chainId: 42161, // ← CONTRACT'S PREFERENCE (not network's 31337)
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
    
    console.log(`\n📊 EIP-712 DOMAIN (CONTRACT'S PREFERENCE):`);
    console.log(`  Name: "${domain.name}"`);
    console.log(`  Version: "${domain.version}"`);
    console.log(`  ChainId: ${domain.chainId} (CONTRACT'S PREFERENCE)`);
    console.log(`  VerifyingContract: ${domain.verifyingContract}`);
    
    // Generate signature with contract's preferred parameters
    const signature = await bidder1.signTypedData(domain, types, testOrder);
    const { r, yParityAndS: vs } = ethers.Signature.from(signature);
    
    console.log(`\n✅ SIGNATURE GENERATED WITH CONTRACT'S CHAINID:`);
    console.log(`  r: ${r}`);
    console.log(`  vs: ${vs}`);
    
    // Test the signature with contract's preferred chainId
    console.log(`\n🧪 TESTING WITH CONTRACT'S PREFERRED CHAINID (42161):`);
    try {
      const result = await router.connect(owner).fillOrderArgs.staticCall(
        testOrder,
        r,
        vs,
        ethers.parseEther("1"), // Fill 1 WETH
        0n, // No taker traits
        "0x" // No args
      );
      
      console.log(`🎉🎉🎉 BREAKTHROUGH! fillOrderArgs WORKED! 🎉🎉🎉`);
      console.log(`  Making Amount: ${ethers.formatEther(result[0])}`);
      console.log(`  Taking Amount: ${ethers.formatUnits(result[1], 6)}`);
      console.log(`  Order Hash: ${result[2]}`);
      
      console.log(`\n🎯 SOLUTION CONFIRMED:`);
      console.log(`  Use chainId 42161 (contract's preference) in EIP-712 domain`);
      console.log(`  NOT the network's chainId (31337)`);
      
    } catch (fillError) {
      console.log(`❌ fillOrderArgs still failed: ${fillError.message}`);
      if (fillError.data) {
        console.log(`  Error data: ${fillError.data}`);
        
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
          
          const decodedError = errorInterface.parseError(fillError.data);
          console.log(`  🎯 DECODED ERROR: ${decodedError.name}`);
        } catch (decodeError) {
          console.log(`  ⚠️ Could not decode error`);
        }
      }
    }
    
  } catch (error) {
    console.error("❌ Error in test:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 