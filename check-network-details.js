const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 CHECKING NETWORK DETAILS FOR SIGNATURE DEBUG");
  console.log("=" .repeat(60));
  
  try {
    // Get network information
    const network = await ethers.provider.getNetwork();
    const currentBlock = await ethers.provider.getBlockNumber();
    
    console.log("📊 NETWORK INFORMATION:");
    console.log(`  Network Name: ${network.name}`);
    console.log(`  Chain ID: ${network.chainId.toString()}`);
    console.log(`  Current Block: ${currentBlock}`);
    console.log("");
    
    // Check what chainId we should be using for signatures
    console.log("🎯 SIGNATURE ANALYSIS:");
    console.log(`  Using in signature: 42161 (Arbitrum Mainnet)`);
    console.log(`  Actual network chainId: ${network.chainId.toString()}`);
    console.log(`  Match: ${network.chainId.toString() === "42161" ? "✅ YES" : "❌ NO - THIS IS THE PROBLEM!"}`);
    
    if (network.chainId.toString() !== "42161") {
      console.log("");
      console.log("🚨 CRITICAL ISSUE FOUND:");
      console.log(`  We're signing with chainId 42161 but the network is using ${network.chainId}`);
      console.log(`  This will cause BadSignature errors!`);
      console.log("");
      console.log("🔧 SOLUTION:");
      console.log(`  Update EIP-712 domain to use chainId: ${network.chainId.toString()}`);
    }
    
    // Also check the router contract address format
    const ROUTER_ADDRESS = process.env.ONEINCH_LOP_ADDRESS || "0x111111125421ca6dc452d289314280a0f8842a65";
    console.log("");
    console.log("📊 CONTRACT ADDRESS CHECK:");
    console.log(`  Router Address: ${ROUTER_ADDRESS}`);
    console.log(`  Checksummed: ${ethers.getAddress(ROUTER_ADDRESS)}`);
    console.log(`  Match: ${ROUTER_ADDRESS === ethers.getAddress(ROUTER_ADDRESS) ? "✅ YES" : "⚠️ Case mismatch"}`);
    
  } catch (error) {
    console.error("❌ Error checking network:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 