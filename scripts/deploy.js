const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying zkFusion contracts...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Deploy CommitmentFactory
  console.log("\n📋 Deploying CommitmentFactory...");
  const CommitmentFactory = await ethers.getContractFactory("CommitmentFactory");
  const factory = await CommitmentFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("CommitmentFactory deployed to:", factoryAddress);

  // Deploy a mock Verifier (for testing - replace with actual Circom-generated verifier)
  console.log("\n🔍 Deploying Mock Verifier...");
  const MockVerifier = await ethers.getContractFactory("MockVerifier");
  const verifier = await MockVerifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  console.log("MockVerifier deployed to:", verifierAddress);

  // Deploy a mock LimitOrderProtocol (for testing)
  console.log("\n📝 Deploying Mock LimitOrderProtocol...");
  const MockLOP = await ethers.getContractFactory("MockLimitOrderProtocol");
  const lop = await MockLOP.deploy();
  await lop.waitForDeployment();
  const lopAddress = await lop.getAddress();
  console.log("MockLimitOrderProtocol deployed to:", lopAddress);

  // Deploy zkFusionExecutor
  console.log("\n⚡ Deploying zkFusionExecutor...");
  const zkFusionExecutor = await ethers.getContractFactory("zkFusionExecutor");
  const executor = await zkFusionExecutor.deploy(verifierAddress, factoryAddress, lopAddress);
  await executor.waitForDeployment();
  const executorAddress = await executor.getAddress();
  console.log("zkFusionExecutor deployed to:", executorAddress);

  // Create a test commitment contract
  console.log("\n🔐 Creating test BidCommitment contract...");
  const tx = await factory.createCommitmentContract();
  const receipt = await tx.wait();
  const event = receipt.logs.find(log => {
    try {
      return factory.interface.parseLog(log).name === 'CommitmentCreated';
    } catch {
      return false;
    }
  });
  const commitmentAddress = event ? factory.interface.parseLog(event).args.commitmentContract : null;
  console.log("Test BidCommitment deployed to:", commitmentAddress);

  // Save deployment addresses
  const deploymentInfo = {
    network: await ethers.provider.getNetwork().then(n => n.name),
    chainId: await ethers.provider.getNetwork().then(n => n.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      CommitmentFactory: factoryAddress,
      MockVerifier: verifierAddress,
      MockLimitOrderProtocol: lopAddress,
      zkFusionExecutor: executorAddress,
      TestBidCommitment: commitmentAddress,
    },
    gasUsed: {
      CommitmentFactory: (await ethers.provider.getTransactionReceipt(await factory.deploymentTransaction().hash)).gasUsed.toString(),
      MockVerifier: (await ethers.provider.getTransactionReceipt(await verifier.deploymentTransaction().hash)).gasUsed.toString(),
      MockLimitOrderProtocol: (await ethers.provider.getTransactionReceipt(await lop.deploymentTransaction().hash)).gasUsed.toString(),
      zkFusionExecutor: (await ethers.provider.getTransactionReceipt(await executor.deploymentTransaction().hash)).gasUsed.toString(),
    }
  };

  // Ensure deployments directory exists
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  // Save to file
  const filename = `deployment-${deploymentInfo.chainId}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${filepath}`);

  // Display summary
  console.log("\n✨ Deployment Summary:");
  console.log("==========================================");
  console.log(`Network: ${deploymentInfo.network} (${deploymentInfo.chainId})`);
  console.log(`CommitmentFactory: ${factoryAddress}`);
  console.log(`MockVerifier: ${verifierAddress}`);
  console.log(`MockLimitOrderProtocol: ${lopAddress}`);
  console.log(`zkFusionExecutor: ${executorAddress}`);
  console.log(`TestBidCommitment: ${commitmentAddress}`);
  console.log("==========================================");

  console.log("\n🎯 Next steps:");
  console.log("1. Replace MockVerifier with actual Circom-generated verifier");
  console.log("2. Replace MockLimitOrderProtocol with 1inch LOP address");
  console.log("3. Run example auction: npm run example");
  console.log("4. Generate ZK circuit: npm run circuit:compile");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 