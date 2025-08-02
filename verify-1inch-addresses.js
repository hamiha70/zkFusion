const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 VERIFYING 1INCH LOP ADDRESSES ON ARBITRUM MAINNET");
  console.log("=" .repeat(60));
  
  // The two addresses in question
  const ADDRESS_1 = "0x1111111254fb6c44bac0bed2854e76f90643097d"; // Original
  const ADDRESS_2 = "0x111111125421ca6dc452d289314280a0f8842a65"; // From GitHub
  
  console.log(`Address 1 (Original): ${ADDRESS_1}`);
  console.log(`Address 2 (GitHub):   ${ADDRESS_2}`);
  console.log("");
  
  try {
    // Check if we're on forked network
    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (chainId: ${network.chainId})`);
    
    // Get current block for reference
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log(`Current block: ${currentBlock}`);
    console.log("");
    
    // Check both addresses
    for (const [label, address] of [["Address 1 (Original)", ADDRESS_1], ["Address 2 (GitHub)", ADDRESS_2]]) {
      console.log(`🔍 Checking ${label}: ${address}`);
      
      try {
        // Check if contract exists
        const code = await ethers.provider.getCode(address);
        const hasCode = code !== "0x";
        console.log(`  Contract exists: ${hasCode ? "✅ YES" : "❌ NO"}`);
        
        if (hasCode) {
          console.log(`  Code length: ${code.length} characters`);
          
          // Try to get contract creation info by checking early blocks
          // (This is a simplified approach - in production you'd use a block explorer API)
          
          // Test basic function calls to see what's available
          const testABI = [
            "function hashOrder((uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)) external view returns (bytes32)",
            "function fillOrderArgs((uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256),bytes32,bytes32,uint256,uint256,bytes) external",
            "function fillOrder((uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256),bytes32,bytes32,uint256,uint256) external"
          ];
          
          const contract = new ethers.Contract(address, testABI, ethers.provider);
          
          // Test if hashOrder exists and works
          try {
            const dummyOrder = [1n, 1n, 0n, 1n, 1n, 1n, 1n, 0n];
            const hash = await contract.hashOrder(dummyOrder);
            console.log(`  hashOrder function: ✅ EXISTS (returns: ${hash.slice(0, 10)}...)`);
          } catch (error) {
            console.log(`  hashOrder function: ❌ FAILED (${error.message.slice(0, 50)}...)`);
          }
          
          // Test if fillOrderArgs exists
          try {
            const dummyOrder = [1n, 1n, 0n, 1n, 1n, 1n, 1n, 0n];
            await contract.fillOrderArgs.staticCall(
              dummyOrder, 
              ethers.ZeroHash, 
              ethers.ZeroHash, 
              1n, 
              0n, 
              "0x"
            );
            console.log(`  fillOrderArgs function: ✅ EXISTS`);
          } catch (error) {
            if (error.message.includes("no matching fragment")) {
              console.log(`  fillOrderArgs function: ❌ NOT FOUND`);
            } else {
              console.log(`  fillOrderArgs function: ✅ EXISTS (reverts as expected: ${error.message.slice(0, 30)}...)`);
            }
          }
          
          // Test if fillOrder exists
          try {
            const dummyOrder = [1n, 1n, 0n, 1n, 1n, 1n, 1n, 0n];
            await contract.fillOrder.staticCall(
              dummyOrder, 
              ethers.ZeroHash, 
              ethers.ZeroHash, 
              1n, 
              0n
            );
            console.log(`  fillOrder function: ✅ EXISTS`);
          } catch (error) {
            if (error.message.includes("no matching fragment")) {
              console.log(`  fillOrder function: ❌ NOT FOUND`);
            } else {
              console.log(`  fillOrder function: ✅ EXISTS (reverts as expected: ${error.message.slice(0, 30)}...)`);
            }
          }
          
        }
        
      } catch (error) {
        console.log(`  ❌ Error checking address: ${error.message}`);
      }
      
      console.log("");
    }
    
    // Additional verification: Check if these are the same contract
    const code1 = await ethers.provider.getCode(ADDRESS_1);
    const code2 = await ethers.provider.getCode(ADDRESS_2);
    
    if (code1 !== "0x" && code2 !== "0x") {
      const sameCode = code1 === code2;
      console.log(`🔍 Contract code comparison:`);
      console.log(`  Same bytecode: ${sameCode ? "✅ YES (same contract)" : "❌ NO (different contracts)"}`);
      
      if (!sameCode) {
        console.log(`  Address 1 code length: ${code1.length}`);
        console.log(`  Address 2 code length: ${code2.length}`);
      }
    }
    
  } catch (error) {
    console.error("❌ Error in verification:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 