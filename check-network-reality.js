const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 NETWORK REALITY CHECK - ARE WE ON FORK OR LIVE?");
  console.log("=" .repeat(60));
  
  const ADDRESS_1 = "0x1111111254fb6c44bac0bed2854e76f90643097d";
  const ADDRESS_2 = "0x111111125421ca6dc452d289314280a0f8642a65";
  
  try {
    // Check network details
    const network = await ethers.provider.getNetwork();
    const currentBlock = await ethers.provider.getBlockNumber();
    
    console.log("📊 NETWORK INFORMATION:");
    console.log(`  Network Name: ${network.name}`);
    console.log(`  Chain ID: ${network.chainId}`);
    console.log(`  Current Block: ${currentBlock}`);
    console.log("");
    
    // Check if we're forking
    console.log("🔍 FORK STATUS CHECK:");
    console.log(`  Expected Fork Block: 364175818`);
    console.log(`  Current Block: ${currentBlock}`);
    console.log(`  Are we on fork?: ${currentBlock === 364175818 ? "✅ YES (exact match)" : "🤔 UNCLEAR"}`);
    console.log("");
    
    // Check both addresses on our current network
    console.log("🔍 CONTRACT EXISTENCE ON CURRENT NETWORK:");
    
    for (const [label, address] of [["Address 1", ADDRESS_1], ["Address 2", ADDRESS_2]]) {
      console.log(`\n📋 ${label}: ${address}`);
      
      const code = await ethers.provider.getCode(address);
      const hasCode = code !== "0x";
      
      console.log(`  Contract exists: ${hasCode ? "✅ YES" : "❌ NO"}`);
      
      if (hasCode) {
        console.log(`  Code length: ${code.length} characters`);
        console.log(`  Code preview: ${code.slice(0, 50)}...`);
        
        // Test a simple view function
        try {
          const testABI = ["function hashOrder((uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)) external view returns (bytes32)"];
          const contract = new ethers.Contract(address, testABI, ethers.provider);
          const dummyOrder = [1n, 1n, 0n, 1n, 1n, 1n, 1n, 0n];
          const hash = await contract.hashOrder(dummyOrder);
          console.log(`  hashOrder test: ✅ WORKS (${hash.slice(0, 10)}...)`);
        } catch (error) {
          console.log(`  hashOrder test: ❌ FAILS (${error.message.slice(0, 40)}...)`);
        }
      } else {
        console.log(`  Code: 0x (no contract deployed)`);
      }
    }
    
    console.log("");
    console.log("🎯 ANALYSIS:");
    
    if (currentBlock === 364175818) {
      console.log("  ✅ We are on FORKED network at exact block 364175818");
      console.log("  ✅ This explains why we see contracts that might not exist on live mainnet");
      console.log("  ⚠️  Arbiscan shows LIVE mainnet, we're testing on HISTORICAL fork");
    } else {
      console.log("  🤔 We might be on live network or different fork block");
      console.log("  🔍 Need to investigate network configuration");
    }
    
    // Check what block we forked from vs current
    console.log("");
    console.log("🔍 BLOCK ANALYSIS:");
    console.log(`  Fork block (expected): 364175818`);
    console.log(`  Current block: ${currentBlock}`);
    console.log(`  Difference: ${currentBlock - 364175818} blocks`);
    
    if (currentBlock > 364175818) {
      console.log("  📈 We're ahead of fork block - might be on live network");
    } else if (currentBlock === 364175818) {
      console.log("  🎯 Exact match - we're on forked network");
    } else {
      console.log("  📉 We're behind - unusual situation");
    }
    
  } catch (error) {
    console.error("❌ Error in network check:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 