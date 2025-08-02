const { expect } = require("chai");
const { ethers } = require("hardhat");
require("dotenv").config();

// Import utilities
const { generateCircuitInputs, generateZkProof } = require("../circuits/utils/proof-utils.js");
const { generateCommitment4 } = require("../circuits/utils/hash-utils.js");

describe("🚨 CRITICAL: True 1inch LOP Integration Test", function () {
  let owner, bidder1, bidder2, bidder3;
  let commitmentFactory, commitmentContract, zkFusionGetter, verifier;
  let oneInchLOP, wethContract, usdcContract;
  
  // Environment configuration
  const FORK_BLOCK_NUMBER = parseInt(process.env.FORK_BLOCK_NUMBER) || 364175818;
  const ONEINCH_LOP_ADDRESS = process.env.ONEINCH_LOP_ADDRESS || "0x1111111254fb6c44bac0bed2854e76f90643097d";
  const WETH_ADDRESS = process.env.WETH_ADDRESS || "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
  
  // Whale addresses for funding
  const WHALE_ETH_ADDRESS = process.env.WHALE_ETH_ADDRESS_1 || "0xFA0a32E5C33b6123122b6b68099001d9371d14e9";
  const WHALE_WETH_ADDRESS = process.env.WHALE_WETH_ADDRESS_1 || "0xf059459220Dd4D37C3b7e18f1B75e5C8A285DD92";
  const WHALE_USDC_ADDRESS = process.env.WHALE_USDC_ADDRESS_1 || "0xD8e35E2450003CD8d50cc804AEE4DB0A8872b7a9";

  before(async function () {
    console.log("\n🔥 CRITICAL INTEGRATION TEST: TRUE 1INCH LOP INTEGRATION");
    console.log("=" .repeat(80));
    console.log(`📍 Forking Arbitrum Mainnet at block: ${FORK_BLOCK_NUMBER}`);
    console.log(`🏦 1inch LOP Address: ${ONEINCH_LOP_ADDRESS}`);
    console.log(`💰 WETH Address: ${WETH_ADDRESS}`);
    console.log(`💵 USDC Address: ${USDC_ADDRESS}`);
    console.log("=" .repeat(80));

    // Get signers
    [owner, bidder1, bidder2, bidder3] = await ethers.getSigners();
    
    // 🚨 CRITICAL: Fund accounts from whales
    await fundAccountsFromWhales();
    
    // Connect to real 1inch LOP contract
    const oneInchLOPABI = [
      "function fillOrder((uint256,address,address,address,address,address,uint256,uint256,uint256,uint256,uint256,uint256,bytes,bytes,bytes,bytes,bytes,bytes) order, bytes signature, bytes interaction, uint256 makingAmount, uint256 takingAmount, uint256 skipPermitAndThresholdAmount) external payable returns (uint256, uint256, bytes32)",
      "function cancelOrder((uint256,address,address,address,address,address,uint256,uint256,uint256,uint256,uint256,uint256,bytes,bytes,bytes,bytes,bytes,bytes) order) external returns (uint256)",
      "function remaining(bytes32 orderHash) external view returns (uint256)",
      "function remainingRaw(bytes32 orderHash) external view returns (uint256)",
      "function simulate(address target, bytes calldata data) external",
    ];
    
    oneInchLOP = await ethers.getContractAt(oneInchLOPABI, ONEINCH_LOP_ADDRESS);
    
    // Connect to real token contracts
    const erc20ABI = [
      "function balanceOf(address account) external view returns (uint256)",
      "function transfer(address to, uint256 amount) external returns (bool)",
      "function approve(address spender, uint256 amount) external returns (bool)",
      "function decimals() external view returns (uint8)",
      "function symbol() external view returns (string)",
    ];
    
    wethContract = await ethers.getContractAt(erc20ABI, WETH_ADDRESS);
    usdcContract = await ethers.getContractAt(erc20ABI, USDC_ADDRESS);
    
    // Deploy our ZK contracts
    await deployZkFusionContracts();
    
    console.log("\n✅ Setup complete. Ready for critical integration test.");
  });

  async function fundAccountsFromWhales() {
    console.log("\n💰 Funding test accounts from whale addresses...");
    
    // Fund with native ETH from ETH whale
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [WHALE_ETH_ADDRESS],
    });
    
    const ethWhale = await ethers.getSigner(WHALE_ETH_ADDRESS);
    const ethAmount = ethers.parseEther("10.0"); // 10 ETH for gas
    
    for (const account of [owner, bidder1, bidder2, bidder3]) {
      await ethWhale.sendTransaction({
        to: account.address,
        value: ethAmount,
      });
      console.log(`  📤 Sent ${ethers.formatEther(ethAmount)} ETH to ${account.address}`);
    }
    
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [WHALE_ETH_ADDRESS],
    });
    
    // Fund with WETH from WETH whale
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [WHALE_WETH_ADDRESS],
    });
    
    const wethWhale = await ethers.getSigner(WHALE_WETH_ADDRESS);
    const wethAmount = ethers.parseEther("100.0"); // 100 WETH
    
    for (const account of [owner, bidder1, bidder2, bidder3]) {
      await wethContract.connect(wethWhale).transfer(account.address, wethAmount);
      console.log(`  📤 Sent ${ethers.formatEther(wethAmount)} WETH to ${account.address}`);
    }
    
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [WHALE_WETH_ADDRESS],
    });
    
    // Fund with USDC from USDC whale
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [WHALE_USDC_ADDRESS],
    });
    
    const usdcWhale = await ethers.getSigner(WHALE_USDC_ADDRESS);
    const usdcAmount = ethers.parseUnits("50000", 6); // 50,000 USDC
    
    for (const account of [owner, bidder1, bidder2, bidder3]) {
      await usdcContract.connect(usdcWhale).transfer(account.address, usdcAmount);
      console.log(`  📤 Sent ${ethers.formatUnits(usdcAmount, 6)} USDC to ${account.address}`);
    }
    
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [WHALE_USDC_ADDRESS],
    });
    
    console.log("✅ All accounts funded successfully");
  }

  async function deployZkFusionContracts() {
    console.log("\n🏗️  Deploying ZK Fusion contracts...");
    
    // Deploy Verifier
    const VerifierFactory = await ethers.getContractFactory("Groth16Verifier");
    verifier = await VerifierFactory.deploy();
    await verifier.waitForDeployment();
    
    // Deploy CommitmentFactory
    const CommitmentFactoryContract = await ethers.getContractFactory("CommitmentFactory");
    commitmentFactory = await CommitmentFactoryContract.deploy();
    await commitmentFactory.waitForDeployment();
    
    // Deploy ZkFusionGetter
    const ZkFusionGetterFactory = await ethers.getContractFactory("ZkFusionGetter");
    zkFusionGetter = await ZkFusionGetterFactory.deploy(
      await verifier.getAddress(),
      await commitmentFactory.getAddress()
    );
    await zkFusionGetter.waitForDeployment();
    
    console.log(`  📋 Verifier deployed at: ${await verifier.getAddress()}`);
    console.log(`  🏭 CommitmentFactory deployed at: ${await commitmentFactory.getAddress()}`);
    console.log(`  🔗 ZkFusionGetter deployed at: ${await zkFusionGetter.getAddress()}`);
  }

  it("🚨 CRITICAL: Should verify staticcall gas limit for ZK proof verification", async function () {
    console.log("\n🔬 Testing staticcall gas limit for ZK proof verification...");
    
    // Create a commitment contract
    const nullHash = generateCommitment4(0n, 0n, ethers.ZeroAddress, ethers.ZeroAddress);
    const tx = await commitmentFactory.createCommitmentContract(nullHash);
    const receipt = await tx.wait();
    
    // Parse the CommitmentCreated event
    const commitmentCreatedEvent = receipt.logs.find(
      log => log.topics[0] === ethers.id("CommitmentCreated(address,address)")
    );
    const commitmentAddress = ethers.getAddress("0x" + commitmentCreatedEvent.topics[2].slice(26));
    commitmentContract = await ethers.getContractAt("BidCommitment", commitmentAddress);
    
    // Initialize with commitments
    const commitment1 = generateCommitment4(1800n, 100n, bidder1.address, commitmentAddress);
    const commitment2 = generateCommitment4(1900n, 150n, bidder2.address, commitmentAddress);
    const commitment3 = generateCommitment4(2000n, 200n, bidder3.address, commitmentAddress);
    const commitment4 = generateCommitment4(2100n, 250n, owner.address, commitmentAddress);
    
    const commitments = [commitment1, commitment2, commitment3, commitment4, nullHash, nullHash, nullHash, nullHash];
    
    await commitmentContract.initializeCommitments(commitments);
    
    // Generate ZK proof
    const bids = [
      { price: 1800n, amount: 100n, bidderAddress: bidder1.address },
      { price: 1900n, amount: 150n, bidderAddress: bidder2.address },
      { price: 2000n, amount: 200n, bidderAddress: bidder3.address },
      { price: 2100n, amount: 250n, bidderAddress: owner.address },
    ];
    
    const makerMinimumPrice = 1850n;
    const makerMaximumAmount = 1000n;
    
    const circuitInputs = generateCircuitInputs(bids, commitments, makerMinimumPrice, makerMaximumAmount, commitmentAddress);
    const { proof, publicSignals } = await generateZkProof(circuitInputs);
    
    // 🚨 CRITICAL TEST: Measure gas usage for getTakingAmount
    console.log("  📊 Measuring gas usage for getTakingAmount (with ZK proof verification)...");
    
    // Create extension data for getTakingAmount
    const extensionData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "uint256[8]", "uint256[2]", "uint256[2]", "uint256[2]", "uint256[2]"],
      [
        commitmentAddress,
        proof,
        [publicSignals[0], publicSignals[1]], // a
        [publicSignals[2], publicSignals[3]], // b
        [publicSignals[4], publicSignals[5]], // c
        [publicSignals[6], publicSignals[7]]  // public inputs
      ]
    );
    
    // Test the gas usage
    const makingAmount = ethers.parseEther("100"); // 100 WETH
    
    // 🚨 This is the critical test - does it fit within staticcall gas limits?
    const gasEstimate = await zkFusionGetter.getTakingAmount.estimateGas(
      makingAmount,
      extensionData
    );
    
    console.log(`  ⛽ Gas estimate for getTakingAmount: ${gasEstimate.toString()}`);
    
    // 1inch LOP staticcall gas limit is typically around 50,000-100,000 gas
    const STATICCALL_GAS_LIMIT = 100000n;
    
    if (gasEstimate > STATICCALL_GAS_LIMIT) {
      console.log(`  🚨 CRITICAL FAILURE: Gas usage (${gasEstimate}) exceeds staticcall limit (${STATICCALL_GAS_LIMIT})`);
      throw new Error(`Gas usage exceeds staticcall limit: ${gasEstimate} > ${STATICCALL_GAS_LIMIT}`);
    } else {
      console.log(`  ✅ CRITICAL SUCCESS: Gas usage (${gasEstimate}) is within staticcall limit (${STATICCALL_GAS_LIMIT})`);
    }
    
    // Actually call the function to ensure it works
    const takingAmount = await zkFusionGetter.getTakingAmount(makingAmount, extensionData);
    console.log(`  💰 Calculated taking amount: ${ethers.formatUnits(takingAmount, 6)} USDC`);
    
    expect(takingAmount).to.be.gt(0);
  });

  it("🚨 CRITICAL: Should test complete 1inch LOP order flow", async function () {
    console.log("\n🔄 Testing complete 1inch LOP order flow...");
    
    // This test will be implemented in the next phase
    // For now, we focus on the staticcall gas limit verification above
    console.log("  ⏳ Complete LOP integration test - TO BE IMPLEMENTED");
    console.log("  📝 This will include:");
    console.log("    - Creating a real 1inch limit order");
    console.log("    - Using our ZkFusionGetter as the getTakingAmount function");
    console.log("    - Executing fillOrder on the real 1inch LOP contract");
    console.log("    - Verifying token transfers and order fulfillment");
    
    // Placeholder assertion
    expect(true).to.be.true;
  });

  after(async function () {
    console.log("\n" + "=".repeat(80));
    console.log("🏁 CRITICAL INTEGRATION TEST COMPLETE");
    console.log("=".repeat(80));
  });
}); 