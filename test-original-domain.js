const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔧 TESTING WITH ORIGINAL 1INCH TEST SUITE DOMAIN");
  console.log("=" .repeat(70));
  
  const ROUTER_ADDRESS = ethers.getAddress("0x111111125421ca6dc452d289314280a0f8842a65");
  const WETH_ADDRESS = process.env.WETH_ADDRESS || "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  console.log(`🎯 Router: ${ROUTER_ADDRESS}`);
  console.log(`💰 WETH: ${WETH_ADDRESS}`);
  console.log(`💵 USDC: ${USDC_ADDRESS}`);
  
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
    console.log("\n📝 Setting up allowances...");
    await weth.connect(bidder1).approve(ROUTER_ADDRESS, ethers.parseEther("100"));
    await usdc.connect(owner).approve(ROUTER_ADDRESS, ethers.parseUnits("200000", 6));
    console.log("✅ Allowances set");
    
    // Create test order
    const testOrder = {
      salt: 123456n,
      maker: bidder1.address,
      receiver: ethers.ZeroAddress,
      makerAsset: WETH_ADDRESS,
      takerAsset: USDC_ADDRESS,
      makingAmount: ethers.parseEther("1"), // 1 WETH
      takingAmount: ethers.parseUnits("1800", 6), // 1800 USDC
      makerTraits: 0n
    };
    
    console.log("\n📊 TEST ORDER:");
    console.log(`  Salt: ${testOrder.salt}`);
    console.log(`  Maker: ${testOrder.maker}`);
    console.log(`  Making: ${ethers.formatEther(testOrder.makingAmount)} WETH`);
    console.log(`  Taking: ${ethers.formatUnits(testOrder.takingAmount, 6)} USDC`);
    
    // Generate order hash
    const orderHash = await router.hashOrder(testOrder);
    console.log(`  Order Hash: ${orderHash}`);
    
    // ORIGINAL 1inch test suite EIP-712 domain
    const originalDomain = {
      name: '1inch Limit Order Protocol', // ← ORIGINAL from test suite
      version: '4',                       // ← ORIGINAL from test suite
      chainId: 42161,                     // Contract's preferred chainId
      verifyingContract: ROUTER_ADDRESS
    };
    
    // What contract's eip712Domain() returns
    const contractDomain = {
      name: '1inch Aggregation Router',   // ← What contract returns
      version: '6',                       // ← What contract returns
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
    
    console.log("\n📊 DOMAIN COMPARISON:");
    console.log("Original Test Suite Domain:");
    console.log(`  Name: "${originalDomain.name}"`);
    console.log(`  Version: "${originalDomain.version}"`);
    console.log("Contract eip712Domain() Returns:");
    console.log(`  Name: "${contractDomain.name}"`);
    console.log(`  Version: "${contractDomain.version}"`);
    
    // TEST 1: Original domain
    console.log("\n🧪 TEST 1: Original Test Suite Domain");
    console.log("-".repeat(50));
    
    try {
      const signature1 = await bidder1.signTypedData(originalDomain, types, testOrder);
      const { r: r1, yParityAndS: vs1 } = ethers.Signature.from(signature1);
      
      const result1 = await router.connect(owner).fillOrderArgs.staticCall(
        testOrder,
        r1,
        vs1,
        ethers.parseEther("1"),
        0n,
        "0x"
      );
      
      console.log("🎉 SUCCESS! Original domain works!");
      console.log(`  Making: ${ethers.formatEther(result1[0])}`);
      console.log(`  Taking: ${ethers.formatUnits(result1[1], 6)}`);
      console.log(`  Hash: ${result1[2]}`);
      
    } catch (error1) {
      console.log(`❌ Original domain failed: ${error1.message}`);
      if (error1.data) {
        console.log(`  Error data: ${error1.data}`);
        
        try {
          const errorInterface = new ethers.Interface([
            "error BadSignature()",
            "error InsufficientBalance()",
            "error InsufficientAllowance()"
          ]);
          const decodedError = errorInterface.parseError(error1.data);
          console.log(`  🎯 DECODED: ${decodedError.name}`);
        } catch (decodeError) {
          console.log(`  ⚠️ Could not decode error`);
        }
      }
    }
    
    // TEST 2: Contract domain
    console.log("\n🧪 TEST 2: Contract's eip712Domain() Values");
    console.log("-".repeat(50));
    
    try {
      const signature2 = await bidder1.signTypedData(contractDomain, types, testOrder);
      const { r: r2, yParityAndS: vs2 } = ethers.Signature.from(signature2);
      
      const result2 = await router.connect(owner).fillOrderArgs.staticCall(
        testOrder,
        r2,
        vs2,
        ethers.parseEther("1"),
        0n,
        "0x"
      );
      
      console.log("🎉 SUCCESS! Contract domain works!");
      console.log(`  Making: ${ethers.formatEther(result2[0])}`);
      console.log(`  Taking: ${ethers.formatUnits(result2[1], 6)}`);
      console.log(`  Hash: ${result2[2]}`);
      
    } catch (error2) {
      console.log(`❌ Contract domain failed: ${error2.message}`);
      if (error2.data) {
        console.log(`  Error data: ${error2.data}`);
        
        try {
          const errorInterface = new ethers.Interface([
            "error BadSignature()",
            "error InsufficientBalance()",
            "error InsufficientAllowance()"
          ]);
          const decodedError = errorInterface.parseError(error2.data);
          console.log(`  🎯 DECODED: ${decodedError.name}`);
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