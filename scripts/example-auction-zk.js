const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const chalk = require('chalk');
const { hashBid, generateNonce } = require('../circuits/utils/poseidon');
const { generateProofWithData } = require('./zk/generate-proof');

async function main() {
  console.log(chalk.blue("🎯 Running zkFusion Example with Real ZK Proofs"));
  console.log(chalk.blue("=================================================\n"));

  const [deployer, bidder1, bidder2, bidder3, bidder4, maker] = await ethers.getSigners();
  
  // Load deployment addresses
  const deploymentsDir = path.join(__dirname, "../deployments");
  const deploymentFiles = fs.readdirSync(deploymentsDir).filter(f => f.startsWith('deployment-'));
  if (deploymentFiles.length === 0) {
    throw new Error("No deployment found. Run 'npm run deploy' first.");
  }
  
  const latestDeployment = deploymentFiles.sort().pop();
  const deployment = JSON.parse(fs.readFileSync(path.join(deploymentsDir, latestDeployment)));
  console.log(chalk.gray(`📁 Using deployment: ${latestDeployment}\n`));
  
  // Get contract instances
  const factory = await ethers.getContractAt("CommitmentFactory", deployment.contracts.CommitmentFactory);
  const executor = await ethers.getContractAt("zkFusionExecutor", deployment.contracts.zkFusionExecutor);
  const mockLOP = await ethers.getContractAt("MockLimitOrderProtocol", deployment.contracts.MockLimitOrderProtocol);
  
  console.log(chalk.green("📋 Contract Addresses:"));
  console.log(chalk.gray(`  Factory: ${deployment.contracts.CommitmentFactory}`));
  console.log(chalk.gray(`  Executor: ${deployment.contracts.zkFusionExecutor}`));
  console.log(chalk.gray(`  Mock LOP: ${deployment.contracts.MockLimitOrderProtocol}\n`));

  // Step 1: Create commitment contract
  console.log(chalk.yellow("🔐 Step 1: Creating BidCommitment contract..."));
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
  console.log(chalk.green(`✅ BidCommitment created: ${commitmentAddress}\n`));
  
  const commitmentContract = await ethers.getContractAt("BidCommitment", commitmentAddress);

  // Step 2: Generate bids with real Poseidon hashes
  console.log(chalk.yellow("💰 Step 2: Generating bids with Poseidon commitments..."));
  
  const bids = [
    { bidder: bidder1, price: 1200n, amount: 100n, nonce: generateNonce() },
    { bidder: bidder2, price: 1150n, amount: 150n, nonce: generateNonce() },
    { bidder: bidder3, price: 1100n, amount: 200n, nonce: generateNonce() },
  ];

  console.log(chalk.blue("  Generated bids:"));
  bids.forEach((bid, i) => {
    console.log(chalk.gray(`    ${i+1}. ${bid.bidder.address.slice(0,8)}... - ${bid.price} @ ${bid.amount} (nonce: ${bid.nonce.toString().slice(0,8)}...)`));
  });

  // Generate commitments using real Poseidon hash
  const commitments = [];
  for (const bid of bids) {
    const commitment = await hashBid(bid.price, bid.amount, bid.nonce);
    commitments.push(commitment);
    
    // Submit commitment on-chain
    const commitTx = await commitmentContract.connect(bid.bidder).commit('0x' + BigInt(commitment).toString(16).padStart(64, '0'));
    await commitTx.wait();
    
    console.log(chalk.gray(`    ✅ ${bid.bidder.address.slice(0,8)}... committed: ${commitment.slice(0,16)}...`));
  }

  // Pad commitments to 4 elements (circuit requirement)
  while (commitments.length < 4) {
    commitments.push('0');
  }

  console.log(chalk.green("✅ All commitments submitted on-chain\n"));

  // Step 3: Create maker order
  console.log(chalk.yellow("📋 Step 3: Creating maker order..."));
  const order = {
    salt: 123456789n,
    makerAsset: "0x1234567890123456789012345678901234567890",
    takerAsset: "0x0987654321098765432109876543210987654321",
    maker: maker.address,
    receiver: maker.address,
    allowedSender: ethers.ZeroAddress,
    makingAmount: 1000n,
    takingAmount: 400n, // Max fill amount
    offsets: 0n,
    interactions: "0x"
  };
  
  const orderSignature = "0x1234";
  console.log(chalk.gray(`  Maker: ${maker.address}`));
  console.log(chalk.gray(`  Making: ${order.makingAmount} tokens`));
  console.log(chalk.gray(`  Taking: ${order.takingAmount} tokens (max fill)\n`));

  // Step 4: Generate real ZK proof
  console.log(chalk.yellow("🔍 Step 4: Generating ZK proof..."));
  console.log(chalk.gray("  This may take 30-60 seconds depending on your hardware...\n"));
  
  try {
    const proofData = await generateProofWithData(
      bids,
      commitments,
      order.takingAmount,
      commitmentAddress
    );

    console.log(chalk.green("✅ ZK proof generated successfully!"));
    console.log(chalk.gray(`  Proof components: ${proofData.proof.length}`));
    console.log(chalk.gray(`  Public signals: ${proofData.publicSignals.length}`));
    
    // Parse proof results
    const totalFill = BigInt(proofData.publicSignals[4]);
    const weightedAvgPrice = BigInt(proofData.publicSignals[5]);
    
    console.log(chalk.blue("\n📊 Auction Results (from ZK proof):"));
    console.log(chalk.gray(`  Total fill: ${totalFill}`));
    console.log(chalk.gray(`  Weighted avg price: ${weightedAvgPrice}\n`));

    // Step 5: Execute with real ZK proof
    console.log(chalk.yellow("⚡ Step 5: Executing auction with ZK proof..."));
    
    // Determine winners (first N bids that contribute to fill)
    const winners = [];
    let runningFill = 0n;
    const sortedBids = [...bids].sort((a, b) => Number(b.price - a.price));
    
    for (const bid of sortedBids) {
      if (runningFill + bid.amount <= order.takingAmount) {
        winners.push(bid.bidder.address);
        runningFill += bid.amount;
      }
    }
    
    // Pad winners array to 4 elements
    while (winners.length < 4) {
      winners.push(ethers.ZeroAddress);
    }

    const executeTx = await executor.connect(deployer).executeWithProof(
      proofData.proof,
      proofData.publicSignals,
      winners,
      commitmentAddress,
      order,
      orderSignature
    );
    
    const executeReceipt = await executeTx.wait();
    console.log(chalk.green(`✅ Auction executed! Tx: ${executeTx.hash}`));
    
    // Parse events
    const auctionEvent = executeReceipt.logs.find(log => {
      try {
        return executor.interface.parseLog(log).name === 'AuctionExecuted';
      } catch {
        return false;
      }
    });
    
    if (auctionEvent) {
      const parsed = executor.interface.parseLog(auctionEvent);
      console.log(chalk.blue("\n🎉 Auction Event Details:"));
      console.log(chalk.gray(`  Winners: ${parsed.args.winners.filter(w => w !== ethers.ZeroAddress).length} bidders`));
      console.log(chalk.gray(`  Total fill: ${parsed.args.totalFill}`));
      console.log(chalk.gray(`  Weighted avg price: ${parsed.args.weightedAvgPrice}`));
    }
    
    const lopEvent = executeReceipt.logs.find(log => {
      try {
        return mockLOP.interface.parseLog(log).name === 'OrderFilled';
      } catch {
        return false;
      }
    });
    
    if (lopEvent) {
      const parsed = mockLOP.interface.parseLog(lopEvent);
      console.log(chalk.blue("\n📈 LOP Fill Event:"));
      console.log(chalk.gray(`  Making amount: ${parsed.args.makingAmount}`));
      console.log(chalk.gray(`  Taking amount: ${parsed.args.takingAmount}`));
      console.log(chalk.gray(`  Maker: ${parsed.args.maker}`));
      console.log(chalk.gray(`  Taker: ${parsed.args.taker}`));
    }

  } catch (error) {
    console.error(chalk.red("❌ ZK proof generation failed:"), error.message);
    console.log(chalk.yellow("\n💡 Troubleshooting:"));
    console.log(chalk.gray("  • Ensure circuit is compiled: npm run circuit:compile"));
    console.log(chalk.gray("  • Ensure trusted setup is done: npm run circuit:setup"));
    console.log(chalk.gray("  • Check that Circom and SnarkJS are installed"));
    return;
  }

  console.log(chalk.green("\n🎉 zkFusion auction with real ZK proof completed successfully!"));
  console.log(chalk.blue("========================================================"));
  console.log(chalk.white("Summary:"));
  console.log(chalk.gray(`• ${bids.length} bidders participated with real Poseidon commitments`));
  console.log(chalk.gray(`• ZK proof generated and verified on-chain`));
  console.log(chalk.gray(`• Auction settled via 1inch LOP integration`));
  console.log(chalk.gray(`• Full privacy preserved for losing bids`));
  console.log(chalk.gray(`• Cryptographic guarantees of fairness maintained`));
  
  console.log(chalk.blue("\n🔮 What happened:"));
  console.log(chalk.gray("1. Bidders committed Poseidon hashes of their bids on-chain"));
  console.log(chalk.gray("2. Off-chain auction runner collected revealed bids"));
  console.log(chalk.gray("3. ZK circuit proved optimal winner selection"));
  console.log(chalk.gray("4. On-chain verifier validated proof and executed fill"));
  console.log(chalk.gray("5. Only winning bid details were revealed publicly"));
  
  console.log(chalk.yellow("\n🚀 This demonstrates the full zkFusion flow with real cryptography!"));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(chalk.red("❌ Example failed:"), error);
    process.exit(1);
  }); 