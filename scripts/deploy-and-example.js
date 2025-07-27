const { ethers } = require("hardhat");
const path = require("path");
const fs = require("fs");

// Import the mock Poseidon hash function
function mockPoseidonHash(price, amount, nonce) {
  // Simple mock hash for demonstration
  const combined = BigInt(price) + BigInt(amount) + BigInt(nonce);
  return '0x' + combined.toString(16).padStart(64, '0');
}

async function main() {
  console.log("🚀 zkFusion: Deploy + Example in One Session");
  console.log("=============================================\n");

  const [deployer, bidder1, bidder2, bidder3, bidder4, maker] = await ethers.getSigners();
  
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Deploy all contracts
  console.log("\n📋 Deploying CommitmentFactory...");
  const CommitmentFactory = await ethers.getContractFactory("CommitmentFactory");
  const factory = await CommitmentFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("CommitmentFactory deployed to:", factoryAddress);

  console.log("\n🔍 Deploying Mock Verifier...");
  const MockVerifier = await ethers.getContractFactory("MockVerifier");
  const verifier = await MockVerifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  console.log("MockVerifier deployed to:", verifierAddress);

  console.log("\n📝 Deploying Mock LimitOrderProtocol...");
  const MockLimitOrderProtocol = await ethers.getContractFactory("MockLimitOrderProtocol");
  const lop = await MockLimitOrderProtocol.deploy();
  await lop.waitForDeployment();
  const lopAddress = await lop.getAddress();
  console.log("MockLimitOrderProtocol deployed to:", lopAddress);

  console.log("\n⚡ Deploying zkFusionExecutor...");
  const zkFusionExecutor = await ethers.getContractFactory("zkFusionExecutor");
  const executor = await zkFusionExecutor.deploy(verifierAddress, factoryAddress, lopAddress);
  await executor.waitForDeployment();
  const executorAddress = await executor.getAddress();
  console.log("zkFusionExecutor deployed to:", executorAddress);

  console.log("\n✅ All contracts deployed successfully!");
  
  // Now run the example auction
  console.log("\n🎯 Running Example Auction");
  console.log("===========================\n");

  // Step 1: Create a new commitment contract for this auction
  console.log("🔐 Step 1: Creating BidCommitment contract...");
  const createTx = await factory.connect(deployer).createCommitmentContract();
  const createReceipt = await createTx.wait();
  
  // Parse the event to get the commitment contract address
  const createEvent = createReceipt.logs.find(log => {
    try {
      const parsed = factory.interface.parseLog(log);
      return parsed && parsed.name === 'CommitmentCreated';
    } catch {
      return false;
    }
  });
  
  if (!createEvent) {
    throw new Error("CommitmentCreated event not found");
  }
  
  const commitmentAddress = factory.interface.parseLog(createEvent).args.commitmentContract;
  console.log(`✅ BidCommitment created: ${commitmentAddress}\n`);
  
  const commitmentContract = await ethers.getContractAt("BidCommitment", commitmentAddress);

  // Step 2: Bidders submit commitments
  console.log("💰 Step 2: Bidders submitting commitments...");
  
  const bids = [
    { bidder: bidder1, price: 1200n, amount: 100n, nonce: 12345n },
    { bidder: bidder2, price: 1150n, amount: 150n, nonce: 23456n },
    { bidder: bidder3, price: 1100n, amount: 200n, nonce: 34567n },
  ];

  for (const bid of bids) {
    const commitment = mockPoseidonHash(bid.price, bid.amount, bid.nonce);
    const commitTx = await commitmentContract.connect(bid.bidder).commit(commitment);
    await commitTx.wait();
    console.log(`  ✅ ${bid.bidder.address.slice(0,8)}... committed bid`);
  }

  // Step 3: Create a maker order
  console.log("\n📋 Step 3: Creating maker order...");
  const order = {
    salt: 123456789n,
    makerAsset: "0x1234567890123456789012345678901234567890",
    takerAsset: "0x0987654321098765432109876543210987654321",
    maker: maker.address,
    receiver: maker.address,
    allowedSender: ethers.ZeroAddress,
    makingAmount: 1000n,
    takingAmount: 400n, // This is what the maker wants to receive
    offsets: 0n,
    interactions: "0x"
  };
  
  const orderSignature = "0x1234"; // Mock signature
  console.log(`  Maker: ${maker.address}`);
  console.log(`  Making: ${order.makingAmount} tokens`);
  console.log(`  Taking: ${order.takingAmount} tokens\n`);

  // Step 4: Simulate off-chain auction
  console.log("🔄 Step 4: Running off-chain auction simulation...");
  
  // Sort bids by price (descending)
  const sortedBids = [...bids].sort((a, b) => Number(b.price - a.price));
  
  // Greedy fill algorithm
  let totalFill = 0n;
  let totalWeighted = 0n;
  const winners = [];
  
  for (const bid of sortedBids) {
    if (totalFill + bid.amount <= order.takingAmount) {
      totalFill += bid.amount;
      totalWeighted += bid.price * bid.amount;
      winners.push(bid.bidder.address);
      console.log(`  ✅ Winner: ${bid.bidder.address.slice(0,8)}... (${bid.price} @ ${bid.amount})`);
    }
  }
  
  const weightedAvgPrice = totalFill > 0n ? totalWeighted / totalFill : 0n;
  console.log(`  Total fill: ${totalFill}`);
  console.log(`  Weighted avg price: ${weightedAvgPrice}\n`);

  // Step 5: Execute with mock ZK proof
  console.log("⚡ Step 5: Executing auction with mock ZK proof...");
  
  // Create mock proof and public inputs
  const mockProof = [1, 2, 3, 4, 5, 6, 7, 8]; // Mock Groth16 proof
  const mockPublicInputs = [
    BigInt(mockPoseidonHash(bids[0].price, bids[0].amount, bids[0].nonce)), // Winner 1 commitment
    BigInt(mockPoseidonHash(bids[1].price, bids[1].amount, bids[1].nonce)), // Winner 2 commitment
    0, // No winner 3
    0, // No winner 4
    Number(totalFill), // Total fill
    Number(weightedAvgPrice), // Weighted avg price
    Number(order.takingAmount), // Maker ask
    BigInt(commitmentAddress) // Contract address as uint160
  ];
  
  // Pad winners array to 4 elements
  const paddedWinners = [...winners];
  while (paddedWinners.length < 4) {
    paddedWinners.push(ethers.ZeroAddress);
  }

  const executeTx = await executor.connect(deployer).executeWithProof(
    mockProof,
    mockPublicInputs,
    paddedWinners,
    commitmentAddress,
    order,
    orderSignature
  );
  
  const executeReceipt = await executeTx.wait();
  console.log(`✅ Auction executed! Tx: ${executeTx.hash}`);
  
  // Parse events
  console.log("\n🎉 Auction Results:");
  console.log("===================");
  
  for (const log of executeReceipt.logs) {
    try {
      if (log.address === executorAddress) {
        const parsed = executor.interface.parseLog(log);
        if (parsed.name === 'AuctionExecuted') {
          console.log(`Event: ${parsed.name}`);
          console.log(`  Winners: ${parsed.args.winners.filter(w => w !== ethers.ZeroAddress).length}`);
          console.log(`  Total fill: ${parsed.args.totalFill}`);
          console.log(`  Weighted avg price: ${parsed.args.weightedAvgPrice}`);
        }
      } else if (log.address === lopAddress) {
        const parsed = lop.interface.parseLog(log);
        if (parsed.name === 'OrderFilled') {
          console.log(`Event: ${parsed.name}`);
          console.log(`  Making amount: ${parsed.args.makingAmount}`);
          console.log(`  Taking amount: ${parsed.args.takingAmount}`);
        }
      }
    } catch (e) {
      // Ignore unparseable events
    }
  }

  console.log("\n🎉 zkFusion auction completed successfully!");
  console.log("========================================");
  console.log("Summary:");
  console.log(`• ${bids.length} bidders participated`);
  console.log(`• ${winners.length} winners selected`);
  console.log(`• ${totalFill} tokens filled`);
  console.log(`• Auction settled via mock 1inch LOP`);
  console.log(`• All contracts working correctly`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }); 