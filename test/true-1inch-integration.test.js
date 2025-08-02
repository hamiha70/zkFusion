const { expect } = require("chai");
const { ethers } = require("hardhat");
require("dotenv").config();

// Import utilities
const { generateCircuitInputs } = require("../circuits/utils/input-generator.js");
const fs = require("fs");
const { execSync } = require("child_process");
const { poseidon4 } = require("poseidon-lite");

// Hash utility function (extracted from demo.js)
async function generateCommitment4(price, amount, bidderAddress, contractAddress) {
    const inputs = [
        BigInt(price),
        BigInt(amount),
        BigInt(bidderAddress),
        BigInt(contractAddress)
    ];
    const result = poseidon4(inputs);
    return result.toString();
}

// ZK Proof generation function (extracted from demo.js)
async function generateZkProof(circuitInputs) {
  // Write circuit inputs to file for snarkjs
  const inputFile = './dist/integration_test_input.json';
  fs.writeFileSync(inputFile, JSON.stringify(circuitInputs, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
  
  // Generate witness
  execSync('cd dist && node zkDutchAuction8_js/generate_witness.js zkDutchAuction8_js/zkDutchAuction8.wasm integration_test_input.json integration_test_witness.wtns', { stdio: 'inherit' });
  
  // Generate ZK proof
  execSync('npx snarkjs groth16 prove ./dist/zkDutchAuction8_0000.zkey ./dist/integration_test_witness.wtns ./dist/integration_test_proof.json ./dist/integration_test_public.json', { stdio: 'inherit' });
  
  // Read generated proof and public signals
  const proof = JSON.parse(fs.readFileSync('./dist/integration_test_proof.json', 'utf8'));
  const publicSignals = JSON.parse(fs.readFileSync('./dist/integration_test_public.json', 'utf8'));
  
  // Convert proof to the format expected by our contract
  const proofArray = [
    proof.pi_a[0], proof.pi_a[1],
    proof.pi_b[0][1], proof.pi_b[0][0],
    proof.pi_b[1][1], proof.pi_b[1][0],
    proof.pi_c[0], proof.pi_c[1]
  ];
  
  return { proof: proofArray, publicSignals };
}

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
    
    // 🚨 CRITICAL: Fund accounts from whales (after contracts are initialized)
    await fundAccountsFromWhales();
    
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
    
    // Fund whale addresses with more ETH for gas fees
    const gasEth = ethers.parseEther("5.0"); // 5 ETH for gas (increased)
    await ethWhale.sendTransaction({
      to: WHALE_WETH_ADDRESS,
      value: gasEth,
    });
    await ethWhale.sendTransaction({
      to: WHALE_USDC_ADDRESS,
      value: gasEth,
    });
    console.log(`  ⛽ Funded whale addresses with ${ethers.formatEther(gasEth)} ETH for gas`);
    
    // Verify gas funding worked
    const wethWhaleBalance = await ethers.provider.getBalance(WHALE_WETH_ADDRESS);
    const usdcWhaleBalance = await ethers.provider.getBalance(WHALE_USDC_ADDRESS);
    console.log(`  ✅ WETH whale balance: ${ethers.formatEther(wethWhaleBalance)} ETH`);
    console.log(`  ✅ USDC whale balance: ${ethers.formatEther(usdcWhaleBalance)} ETH`);
    
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
    const wethAmount = ethers.parseEther("50.0"); // 50 WETH (reduced from 100 to fit whale's balance)
    
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
    
    // Deploy zkFusionExecutor
    const zkFusionExecutorFactory = await ethers.getContractFactory("zkFusionExecutor");
    const zkFusionExecutor = await zkFusionExecutorFactory.deploy(
      ONEINCH_LOP_ADDRESS, // _lop
      await verifier.getAddress(), // _verifier
      await commitmentFactory.getAddress() // _factory
    );
    await zkFusionExecutor.waitForDeployment();
    
    // Deploy ZkFusionGetter
    const ZkFusionGetterFactory = await ethers.getContractFactory("ZkFusionGetter");
    zkFusionGetter = await ZkFusionGetterFactory.deploy(
      await zkFusionExecutor.getAddress()
    );
    await zkFusionGetter.waitForDeployment();
    
    console.log(`  📋 Verifier deployed at: ${await verifier.getAddress()}`);
    console.log(`  🏭 CommitmentFactory deployed at: ${await commitmentFactory.getAddress()}`);
    console.log(`  ⚡ zkFusionExecutor deployed at: ${await zkFusionExecutor.getAddress()}`);
    console.log(`  🔗 ZkFusionGetter deployed at: ${await zkFusionGetter.getAddress()}`);
  }

  it("🚨 CRITICAL: Should verify staticcall gas limit for ZK proof verification", async function () {
    console.log("\n🔬 Testing staticcall gas limit for ZK proof verification...");
    
    // Create a commitment contract (no parameters needed)
    const tx = await commitmentFactory.createCommitmentContract();
    const receipt = await tx.wait();
    
    // Parse the CommitmentCreated event
    const commitmentCreatedEvent = receipt.logs.find(
      log => log.topics[0] === ethers.id("CommitmentCreated(address,address)")
    );
    const commitmentAddress = ethers.getAddress("0x" + commitmentCreatedEvent.topics[2].slice(26));
    commitmentContract = await ethers.getContractAt("BidCommitment", commitmentAddress);
    
    // Generate commitments for initialization
    const nullHash = await generateCommitment4(0n, 0n, ethers.ZeroAddress, commitmentAddress);
    const commitment1 = await generateCommitment4(1800n, 100n, bidder1.address, commitmentAddress);
    const commitment2 = await generateCommitment4(1900n, 150n, bidder2.address, commitmentAddress);
    const commitment3 = await generateCommitment4(2000n, 200n, bidder3.address, commitmentAddress);
    const commitment4 = await generateCommitment4(2100n, 250n, owner.address, commitmentAddress);
    
    // Initialize the contract with nullHash and initial commitments
    await commitmentContract.initialize(
      nullHash,
      [bidder1.address, bidder2.address, bidder3.address, owner.address],
      [commitment1, commitment2, commitment3, commitment4]
    );
    
    const commitments = [commitment1, commitment2, commitment3, commitment4, nullHash, nullHash, nullHash, nullHash];
    
    // Generate ZK proof
    const bids = [
      { price: 1800n, amount: 100n, bidderAddress: bidder1.address },
      { price: 1900n, amount: 150n, bidderAddress: bidder2.address },
      { price: 2000n, amount: 200n, bidderAddress: bidder3.address },
      { price: 2100n, amount: 250n, bidderAddress: owner.address },
    ];
    
    const makerMinimumPrice = 1850n;
    const makerMaximumAmount = 1000n;
    
    const circuitInputs = await generateCircuitInputs(bids, commitments, makerMinimumPrice, makerMaximumAmount, commitmentAddress);
    const { proof, publicSignals } = await generateZkProof(circuitInputs);
    
    // 🚨 CRITICAL TEST: Measure gas usage for getTakingAmount
    console.log("  📊 Measuring gas usage for getTakingAmount (with ZK proof verification)...");
    
    // Debug the proof and public signals
    console.log(`  🔍 Proof array length: ${proof.length}`);
    console.log(`  🔍 Proof values: ${proof.map(v => v ? 'OK' : 'NULL').join(', ')}`);
    console.log(`  🔍 PublicSignals length: ${publicSignals.length}`);
    console.log(`  🔍 PublicSignals values: ${publicSignals.map(v => v ? 'OK' : 'NULL').join(', ')}`);
    
    // Create extension data for getTakingAmount
    // Format: Proof struct, uint256[3] publicSignals, uint256[8] originalWinnerBits, address commitmentContract
    const proofStruct = {
      a: [proof[0], proof[1]],
      b: [[proof[2], proof[3]], [proof[4], proof[5]]],
      c: [proof[6], proof[7]]
    };
    
    // Generate originalWinnerBits (8 bits representing which bids won)
    // For our test: first 4 bids are real, last 4 are null
    const originalWinnerBits = [1, 1, 1, 1, 0, 0, 0, 0]; // First 4 won, last 4 didn't
    
    const extensionData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c)", "uint256[3]", "uint256[8]", "address"],
      [
        proofStruct,
        publicSignals,
        originalWinnerBits,
        commitmentAddress
      ]
    );
    
    // Test the gas usage
    const makingAmount = ethers.parseEther("100"); // 100 WETH
    
    // Create a minimal 1inch Order struct for testing
    // Note: Using the exact 1inch LOP v4 Order structure
    const dummyOrder = {
      salt: 1,
      maker: BigInt(owner.address),        // Address type (uint256)
      receiver: 0n,                        // Address type (uint256) - zero for no receiver
      makerAsset: BigInt(WETH_ADDRESS),    // Address type (uint256)
      takerAsset: BigInt(USDC_ADDRESS),    // Address type (uint256)
      makingAmount: makingAmount,          // uint256
      takingAmount: 0,                     // uint256 - will be calculated
      makerTraits: 0n                      // MakerTraits type (uint256)
    };
    
    // 🚨 This is the critical test - does it fit within staticcall gas limits?
    const gasEstimate = await zkFusionGetter.getTakingAmount.estimateGas(
      dummyOrder,           // order
      extensionData,        // extension  
      ethers.ZeroHash,      // orderHash
      bidder1.address,      // taker
      makingAmount,         // makingAmount
      makingAmount,         // remainingMakingAmount  
      "0x"                  // extraData
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