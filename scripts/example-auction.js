const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Mock Poseidon hash function for demo (replace with actual implementation)
function mockPoseidonHash(price, amount, nonce) {
  return ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256", "uint256", "uint256"],
    [price, amount, nonce]
  ));
}

async function main() {
  console.log("🎯 Running zkFusion Example Auction");
  console.log("=====================================\n");

  const [deployer, bidder1, bidder2, bidder3, bidder4, maker] = await ethers.getSigners();
  
  // Load deployment addresses (use latest deployment)
  const deploymentsDir = path.join(__dirname, "../deployments");
  const deploymentFiles = fs.readdirSync(deploymentsDir).filter(f => f.startsWith('deployment-'));
  if (deploymentFiles.length === 0) {
    throw new Error("No deployment found. Run 'npm run deploy' first.");
  }
  
  const latestDeployment = deploymentFiles.sort().pop();
  const deployment = JSON.parse(fs.readFileSync(path.join(deploymentsDir, latestDeployment)));
  console.log(`📁 Using deployment: ${latestDeployment}`);
  
  // Get contract instances
  const factory = await ethers.getContractAt("CommitmentFactory", deployment.contracts.CommitmentFactory);
  const executor = await ethers.getContractAt("zkFusionExecutor", deployment.contracts.zkFusionExecutor);
  const mockLOP = await ethers.getContractAt("MockLimitOrderProtocol", deployment.contracts.MockLimitOrderProtocol);
  
  console.log(`🏭 Factory: ${deployment.contracts.CommitmentFactory}`);
  console.log(`⚡ Executor: ${deployment.contracts.zkFusionExecutor}`);
  console.log(`📝 Mock LOP: ${deployment.contracts.MockLimitOrderProtocol}\n`);

  // Step 1: Create a new commitment contract for this auction
  console.log("🔐 Step 1: Creating BidCommitment contract...");
  const createTx = await factory.connect(deployer).createCommitmentContract();
  const createReceipt = await createTx.wait();
  const createEvent = createReceipt.logs.find(log => {
    try {
      return factory.interface.parseLog(log).name === 'CommitmentCreated';
    } catch {
      return false;
    }
  });
  const commitmentAddress = factory.interface.parseLog(createEvent).args.commitmentContract;
  console.log(`✅ BidCommitment created: ${commitmentAddress}\n`);
  
  const commitmentContract = await ethers.getContractAt("BidCommitment", commitmentAddress);

  // Step 2: Bidders submit commitments
  console.log("💰 Step 2: Bidders submitting commitments...");
  
  const bids = [
    { bidder: bidder1, price: 1200n, amount: 100n, nonce: 12345n },
    { bidder: bidder2, price: 1150n, amount: 150n, nonce: 23456n },
    { bidder: bidder3, price: 1100n, amount: 200n, nonce: 34567n },
    { bidder: bidder4, price: 1050n, amount: 250n, nonce: 45678n },
  ];

  const commitments = [];
  for (let i = 0; i < bids.length; i++) {
    const bid = bids[i];
    const commitment = mockPoseidonHash(bid.price, bid.amount, bid.nonce);
    commitments.push(commitment);
    
    const commitTx = await commitmentContract.connect(bid.bidder).commit(commitment);
    await commitTx.wait();
    
    console.log(`  ${bid.bidder.address.slice(0,8)}... committed: price=${bid.price}, amount=${bid.amount}`);
  }
  console.log("✅ All commitments submitted\n");

  // Step 3: Create a mock order
  console.log("📋 Step 3: Creating maker order...");
  const order = {
    salt: 123456789n,
    makerAsset: "0x1234567890123456789012345678901234567890", // Mock token
    takerAsset: "0x0987654321098765432109876543210987654321", // Mock token
    maker: maker.address,
    receiver: maker.address,
    allowedSender: "0x0000000000000000000000000000000000000000",
    makingAmount: 1000n, // Maker wants to sell 1000 tokens
    takingAmount: 400n,  // Maker wants to receive 400 tokens (asking for fills up to 400)
    offsets: 0n,
    interactions: "0x"
  };
  
  const orderSignature = "0x1234"; // Mock signature
  console.log(`  Maker: ${maker.address}`);
  console.log(`  Making: ${order.makingAmount} tokens`);
  console.log(`  Taking: ${order.takingAmount} tokens (max fill)\n`);

  // Step 4: Simulate off-chain auction logic
  console.log("🧮 Step 4: Running off-chain auction simulation...");
  
  // Sort bids by price descending
  const sortedBids = [...bids].sort((a, b) => Number(b.price - a.price));
  console.log("  Sorted bids (highest price first):");
  sortedBids.forEach((bid, i) => {
    console.log(`    ${i+1}. ${bid.bidder.address.slice(0,8)}... - ${bid.price} @ ${bid.amount}`);
  });
  
  // Select winners greedily
  let totalFill = 0n;
  let totalWeighted = 0n;
  const winners = [];
  
  for (const bid of sortedBids) {
    if (totalFill + bid.amount <= order.takingAmount) {
      totalFill += bid.amount;
      totalWeighted += bid.price * bid.amount;
      winners.push(bid);
      console.log(`    ✅ Selected: ${bid.bidder.address.slice(0,8)}... (${bid.amount} @ ${bid.price})`);
    } else {
      console.log(`    ❌ Rejected: ${bid.bidder.address.slice(0,8)}... (would exceed limit)`);
    }
  }
  
  const weightedAvgPrice = totalFill > 0n ? totalWeighted / totalFill : 0n;
  console.log(`  Total fill: ${totalFill}`);
  console.log(`  Weighted avg price: ${weightedAvgPrice}\n`);

  // Step 5: Generate mock ZK proof
  console.log("🔍 Step 5: Generating mock ZK proof...");
  
  // In a real implementation, this would be generated by Circom
  const mockProof = [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n]; // Mock proof components
  
  // Public inputs: [winner commitments (4), totalFill, weightedAvgPrice, makerAsk, commitmentContractAddress]
  const publicInputs = [
    ...commitments, // All commitments (some may be zero if not winners)
    totalFill,
    weightedAvgPrice,
    order.takingAmount,
    BigInt(commitmentAddress)
  ];
  
  const winnerAddresses = winners.map(w => w.bidder.address);
  // Pad to 4 addresses if needed
  while (winnerAddresses.length < 4) {
    winnerAddresses.push("0x0000000000000000000000000000000000000000");
  }
  
  console.log(`  Proof components: [${mockProof.join(', ')}]`);
  console.log(`  Public inputs: [${publicInputs.join(', ')}]`);
  console.log(`  Winners: ${winnerAddresses.map(a => a.slice(0,8) + '...').join(', ')}\n`);

  // Step 6: Execute with proof
  console.log("⚡ Step 6: Executing auction with ZK proof...");
  
  try {
    const executeTx = await executor.connect(deployer).executeWithProof(
      mockProof,
      publicInputs,
      winnerAddresses,
      commitmentAddress,
      order,
      orderSignature
    );
    
    const executeReceipt = await executeTx.wait();
    console.log(`✅ Auction executed! Tx: ${executeTx.hash}`);
    
    // Check events
    const auctionEvent = executeReceipt.logs.find(log => {
      try {
        return executor.interface.parseLog(log).name === 'AuctionExecuted';
      } catch {
        return false;
      }
    });
    
    if (auctionEvent) {
      const parsed = executor.interface.parseLog(auctionEvent);
      console.log(`  Winners: ${parsed.args.winners.length} bidders`);
      console.log(`  Total fill: ${parsed.args.totalFill}`);
      console.log(`  Weighted avg price: ${parsed.args.weightedAvgPrice}`);
    }
    
    // Check LOP fill event
    const lopEvent = executeReceipt.logs.find(log => {
      try {
        return mockLOP.interface.parseLog(log).name === 'OrderFilled';
      } catch {
        return false;
      }
    });
    
    if (lopEvent) {
      const parsed = mockLOP.interface.parseLog(lopEvent);
      console.log(`  LOP fill - Making: ${parsed.args.makingAmount}, Taking: ${parsed.args.takingAmount}`);
    }
    
  } catch (error) {
    console.error("❌ Execution failed:", error.message);
    return;
  }

  console.log("\n🎉 zkFusion auction completed successfully!");
  console.log("=====================================");
  console.log("Summary:");
  console.log(`• ${bids.length} bidders participated`);
  console.log(`• ${winners.length} winning bids selected`);
  console.log(`• ${totalFill} tokens filled at avg price ${weightedAvgPrice}`);
  console.log(`• Auction runner: ${deployer.address.slice(0,8)}...`);
  console.log(`• Commitment contract: ${commitmentAddress.slice(0,8)}...`);
  console.log("\n🔮 Next steps:");
  console.log("1. Replace mock components with real ZK circuit");
  console.log("2. Integrate with actual 1inch LOP");
  console.log("3. Add UI for bidder participation");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Example failed:", error);
    process.exit(1);
  }); 