const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔍 DEBUGGING fillOrderArgs EXECUTION ISSUE");
  console.log("=" .repeat(60));
  
  const ROUTER_ADDRESS = process.env.ONEINCH_LOP_ADDRESS || "0x111111125421ca6dc452d289314280a0f8842a65";
  const WETH_ADDRESS = process.env.WETH_ADDRESS || "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  console.log(`🎯 Router: ${ROUTER_ADDRESS}`);
  console.log(`💰 WETH: ${WETH_ADDRESS}`);
  console.log(`💵 USDC: ${USDC_ADDRESS}`);
  console.log("");

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
      "function approve(address spender, uint256 amount) external returns (bool)",
      "function decimals() external view returns (uint8)"
    ];
    
    const router = await ethers.getContractAt(routerABI, ROUTER_ADDRESS);
    const weth = await ethers.getContractAt(erc20ABI, WETH_ADDRESS);
    const usdc = await ethers.getContractAt(erc20ABI, USDC_ADDRESS);
    
    console.log("📊 STEP 1: Check Account Balances & Allowances");
    console.log("-".repeat(50));
    
    // Check balances
    const makerWethBalance = await weth.balanceOf(bidder1.address);
    const makerUsdcBalance = await usdc.balanceOf(bidder1.address);
    const takerWethBalance = await weth.balanceOf(owner.address);
    const takerUsdcBalance = await usdc.balanceOf(owner.address);
    
    console.log(`Maker (${bidder1.address}):`);
    console.log(`  WETH Balance: ${ethers.formatEther(makerWethBalance)}`);
    console.log(`  USDC Balance: ${ethers.formatUnits(makerUsdcBalance, 6)}`);
    
    console.log(`Taker (${owner.address}):`);
    console.log(`  WETH Balance: ${ethers.formatEther(takerWethBalance)}`);
    console.log(`  USDC Balance: ${ethers.formatUnits(takerUsdcBalance, 6)}`);
    
    // Check allowances
    const makerWethAllowance = await weth.allowance(bidder1.address, ROUTER_ADDRESS);
    const takerUsdcAllowance = await usdc.allowance(owner.address, ROUTER_ADDRESS);
    
    console.log(`\nAllowances to Router:`);
    console.log(`  Maker WETH Allowance: ${ethers.formatEther(makerWethAllowance)}`);
    console.log(`  Taker USDC Allowance: ${ethers.formatUnits(takerUsdcAllowance, 6)}`);
    
    // Set up allowances if needed
    if (makerWethAllowance < ethers.parseEther("100")) {
      console.log(`\n📝 Setting WETH allowance for maker...`);
      await weth.connect(bidder1).approve(ROUTER_ADDRESS, ethers.parseEther("200"));
      console.log(`✅ WETH allowance set`);
    }
    
    if (takerUsdcAllowance < ethers.parseUnits("200000", 6)) {
      console.log(`📝 Setting USDC allowance for taker...`);
      await usdc.connect(owner).approve(ROUTER_ADDRESS, ethers.parseUnits("300000", 6));
      console.log(`✅ USDC allowance set`);
    }
    
    console.log("\n📊 STEP 2: Test Basic Order Hash Generation");
    console.log("-".repeat(50));
    
    // Create a simple order
    const simpleOrder = {
      salt: 12345n,
      maker: bidder1.address,
      receiver: ethers.ZeroAddress,
      makerAsset: WETH_ADDRESS,
      takerAsset: USDC_ADDRESS,
      makingAmount: ethers.parseEther("1"), // 1 WETH (smaller amount)
      takingAmount: ethers.parseUnits("1800", 6), // 1800 USDC
      makerTraits: 0n
    };
    
    try {
      const orderHash = await router.hashOrder(simpleOrder);
      console.log(`✅ Order hash generated: ${orderHash}`);
    } catch (hashError) {
      console.log(`❌ Order hash failed: ${hashError.message}`);
      return;
    }
    
    console.log("\n📊 STEP 3: Test Signature Generation");
    console.log("-".repeat(50));
    
    // EIP-712 domain (corrected)
    const domain = {
      name: '1inch Aggregation Router',
      version: '6',
      chainId: 42161,
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
    
    try {
      const signature = await bidder1.signTypedData(domain, types, simpleOrder);
      const { r, yParityAndS: vs } = ethers.Signature.from(signature);
      console.log(`✅ Signature generated successfully`);
      console.log(`   r: ${r}`);
      console.log(`   vs: ${vs}`);
      
      console.log("\n📊 STEP 4: Test Minimal fillOrderArgs Call");
      console.log("-".repeat(50));
      
      try {
        // Test with minimal parameters (no extensions)
        const result = await router.connect(owner).fillOrderArgs.staticCall(
          simpleOrder,
          r,
          vs,
          ethers.parseEther("1"), // Fill 1 WETH
          0n, // No taker traits
          "0x" // No args
        );
        console.log(`✅ Minimal fillOrderArgs succeeded!`);
        console.log(`   Making Amount: ${ethers.formatEther(result[0])}`);
        console.log(`   Taking Amount: ${ethers.formatUnits(result[1], 6)}`);
        console.log(`   Order Hash: ${result[2]}`);
        
      } catch (fillError) {
        console.log(`❌ Minimal fillOrderArgs failed: ${fillError.message}`);
        if (fillError.data) {
          console.log(`   Error data: ${fillError.data}`);
        }
        
        // Try to decode the error
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
          console.log(`   🎯 DECODED ERROR: ${decodedError.name}`);
        } catch (decodeError) {
          console.log(`   ⚠️ Could not decode error`);
        }
      }
      
    } catch (signError) {
      console.log(`❌ Signature generation failed: ${signError.message}`);
    }
    
  } catch (error) {
    console.error("❌ Error in debugging:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 