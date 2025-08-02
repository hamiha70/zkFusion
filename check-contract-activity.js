const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 CHECKING 1INCH LOP CONTRACT ACTIVITY ON ARBITRUM");
  console.log("=" .repeat(60));
  
  const ADDRESS_1 = "0x1111111254fb6c44bac0bed2854e76f90643097d"; // Original
  const ADDRESS_2 = "0x111111125421ca6dc452d289314280a0f8842a65"; // GitHub
  
  console.log(`Address 1 (Original): ${ADDRESS_1}`);
  console.log(`Address 2 (GitHub):   ${ADDRESS_2}`);
  console.log("");
  
  try {
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log(`Current block: ${currentBlock}`);
    console.log(`Checking last 1000 blocks (from ${currentBlock - 1000} to ${currentBlock})`);
    console.log("");
    
    // Function signatures we care about
    const FILL_ORDER_SELECTOR = "0x62e238bb"; // fillOrder(...)
    const FILL_ORDER_ARGS_SELECTOR = "0x3eca9c0a"; // fillOrderArgs(...)
    const HASH_ORDER_SELECTOR = "0x7d3d999a"; // hashOrder(...)
    
    console.log("Function selectors to look for:");
    console.log(`  fillOrder: ${FILL_ORDER_SELECTOR}`);
    console.log(`  fillOrderArgs: ${FILL_ORDER_ARGS_SELECTOR}`);
    console.log(`  hashOrder: ${HASH_ORDER_SELECTOR}`);
    console.log("");
    
    // Check activity for both addresses
    for (const [label, address] of [["Address 1 (Original)", ADDRESS_1], ["Address 2 (GitHub)", ADDRESS_2]]) {
      console.log(`🔍 Checking activity for ${label}`);
      console.log(`   Address: ${address}`);
      
      let totalTxCount = 0;
      let fillOrderCount = 0;
      let fillOrderArgsCount = 0;
      let hashOrderCount = 0;
      let successfulTxCount = 0;
      let recentTxBlocks = [];
      
      // Check transactions in recent blocks
      const startBlock = Math.max(currentBlock - 1000, 0);
      
      try {
        // Sample every 10th block to avoid rate limits
        for (let blockNum = startBlock; blockNum <= currentBlock; blockNum += 10) {
          try {
            const block = await ethers.provider.getBlock(blockNum, true);
            
            if (block && block.transactions) {
              for (const tx of block.transactions) {
                if (tx.to && tx.to.toLowerCase() === address.toLowerCase()) {
                  totalTxCount++;
                  recentTxBlocks.push(blockNum);
                  
                  // Check if transaction was successful
                  try {
                    const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
                    if (receipt && receipt.status === 1) {
                      successfulTxCount++;
                    }
                  } catch (e) {
                    // Skip if can't get receipt
                  }
                  
                  // Check function called
                  if (tx.data && tx.data.length >= 10) {
                    const selector = tx.data.slice(0, 10).toLowerCase();
                    
                    if (selector === FILL_ORDER_SELECTOR.toLowerCase()) {
                      fillOrderCount++;
                    } else if (selector === FILL_ORDER_ARGS_SELECTOR.toLowerCase()) {
                      fillOrderArgsCount++;
                    } else if (selector === HASH_ORDER_SELECTOR.toLowerCase()) {
                      hashOrderCount++;
                    }
                  }
                  
                  // Limit output to avoid spam
                  if (totalTxCount <= 5) {
                    console.log(`     Tx: ${tx.hash} (block ${blockNum}, selector: ${tx.data.slice(0, 10)})`);
                  }
                }
              }
            }
          } catch (blockError) {
            // Skip blocks that can't be fetched
          }
        }
        
        console.log(`  📊 Activity Summary:`);
        console.log(`     Total transactions: ${totalTxCount}`);
        console.log(`     Successful transactions: ${successfulTxCount}`);
        console.log(`     fillOrder calls: ${fillOrderCount}`);
        console.log(`     fillOrderArgs calls: ${fillOrderArgsCount}`);
        console.log(`     hashOrder calls: ${hashOrderCount}`);
        
        if (recentTxBlocks.length > 0) {
          const mostRecentBlock = Math.max(...recentTxBlocks);
          const oldestBlock = Math.min(...recentTxBlocks);
          console.log(`     Most recent activity: block ${mostRecentBlock}`);
          console.log(`     Oldest activity: block ${oldestBlock}`);
          console.log(`     Activity span: ${mostRecentBlock - oldestBlock} blocks`);
        } else {
          console.log(`     ⚠️ No recent activity found`);
        }
        
      } catch (error) {
        console.log(`     ❌ Error checking activity: ${error.message}`);
      }
      
      console.log("");
    }
    
    // Additional check: Look for contract events
    console.log("🔍 Checking for recent events...");
    
    for (const [label, address] of [["Address 1", ADDRESS_1], ["Address 2", ADDRESS_2]]) {
      try {
        // Look for any events in recent blocks
        const filter = {
          address: address,
          fromBlock: currentBlock - 100,
          toBlock: currentBlock
        };
        
        const logs = await ethers.provider.getLogs(filter);
        console.log(`  ${label}: ${logs.length} events in last 100 blocks`);
        
        if (logs.length > 0) {
          const recentLog = logs[logs.length - 1];
          console.log(`    Most recent event: block ${recentLog.blockNumber}, tx ${recentLog.transactionHash}`);
        }
        
      } catch (eventError) {
        console.log(`  ${label}: Error checking events - ${eventError.message}`);
      }
    }
    
  } catch (error) {
    console.error("❌ Error in activity check:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 