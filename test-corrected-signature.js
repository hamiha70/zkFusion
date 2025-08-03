const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔧 TESTING CORRECTED SIGNATURE PARAMETERS");
  console.log("=" .repeat(60));
  
  const ROUTER_ADDRESS = ethers.getAddress("0x111111125421ca6dc452d289314280a0f8842a65"); // Checksummed
  const WETH_ADDRESS = process.env.WETH_ADDRESS || "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  console.log(`🎯 Router: ${ROUTER_ADDRESS}`);
  console.log(`💰 WETH: ${WETH_ADDRESS}`);
  console.log(`💵 USDC: ${USDC_ADDRESS}`);
  
  try {
    // Get signers and network info
    const [owner, bidder1] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    const actualChainId = network.chainId;
    
    console.log(`\n📊 NETWORK INFO:`);
    console.log(`  Actual ChainId: ${actualChainId}`);
    console.log(`  Using in signature: ${actualChainId} (CORRECTED)`);
    
    // Connect to router
    const routerABI = [
      "function hashOrder((uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order) external view returns (bytes32 orderHash)",
      "function fillOrderArgs((uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes32 r, bytes32 vs, uint256 amount, uint256 takerTraits, bytes args) external payable returns (uint256 makingAmount, uint256 takingAmount, bytes32 orderHash)"
    ];
    
    const router = await ethers.getContractAt(routerABI, ROUTER_ADDRESS);
    
    // Create a simple test order
    const testOrder = {
      salt: 54321n,
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
    
    // CORRECTED EIP-712 domain with actual chainId
    const domain = {
      name: '1inch Aggregation Router',
      version: '6',
      chainId: actualChainId, // ← CORRECTED: Use actual chainId (31337)
      verifyingContract: ROUTER_ADDRESS // ← CORRECTED: Use checksummed address
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
    
    console.log(`\n📊 EIP-712 DOMAIN (CORRECTED):`);
    console.log(`  Name: "${domain.name}"`);
    console.log(`  Version: "${domain.version}"`);
    console.log(`  ChainId: ${domain.chainId} (CORRECTED)`);
    console.log(`  VerifyingContract: ${domain.verifyingContract} (CHECKSUMMED)`);
    
    // Generate signature with corrected parameters
    const signature = await bidder1.signTypedData(domain, types, testOrder);
    const { r, yParityAndS: vs } = ethers.Signature.from(signature);
    
    console.log(`\n✅ SIGNATURE GENERATED:`);
    console.log(`  r: ${r}`);
    console.log(`  vs: ${vs}`);
    
    // Test the corrected signature
    console.log(`\n🧪 TESTING CORRECTED SIGNATURE:`);
    try {
      const result = await router.connect(owner).fillOrderArgs.staticCall(
        testOrder,
        r,
        vs,
        ethers.parseEther("1"), // Fill 1 WETH
        0n, // No taker traits
        "0x" // No args
      );
      
      console.log(`🎉 SUCCESS! fillOrderArgs worked!`);
      console.log(`  Making Amount: ${ethers.formatEther(result[0])}`);
      console.log(`  Taking Amount: ${ethers.formatUnits(result[1], 6)}`);
      console.log(`  Order Hash: ${result[2]}`);
      
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