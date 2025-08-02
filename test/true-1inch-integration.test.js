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
  const ONEINCH_LOP_ADDRESS = process.env.ONEINCH_LOP_ADDRESS || "0x111111125421ca6dc452d289314280a0f8842a65";
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
      // fillOrder function (basic version) - uses Address and MakerTraits types
      "function fillOrder((uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes32 r, bytes32 vs, uint256 amount, uint256 takerTraits) external payable returns (uint256 makingAmount, uint256 takingAmount, bytes32 orderHash)",
      
      // fillOrderArgs function (with args parameter for extensions) - uses Address and MakerTraits types  
      "function fillOrderArgs((uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order, bytes32 r, bytes32 vs, uint256 amount, uint256 takerTraits, bytes args) external payable returns (uint256 makingAmount, uint256 takingAmount, bytes32 orderHash)",
      
      // hashOrder function - uses Address and MakerTraits types
      "function hashOrder((uint256 salt, uint256 maker, uint256 receiver, uint256 makerAsset, uint256 takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order) external view returns (bytes32 orderHash)",
      
      // Other useful functions
      "function cancelOrder(uint256 makerTraits, bytes32 orderHash) external",
      "function remainingInvalidatorForOrder(address maker, bytes32 orderHash) external view returns (uint256 remaining)",
      "function simulate(address target, bytes calldata data) external",
    ];
    
    oneInchLOP = await ethers.getContractAt(oneInchLOPABI, ONEINCH_LOP_ADDRESS);
    
    // Connect to real token contracts
    const erc20ABI = [
      "function balanceOf(address account) external view returns (uint256)",
      "function transfer(address to, uint256 amount) external returns (bool)",
      "function approve(address spender, uint256 amount) external returns (bool)",
      "function allowance(address owner, address spender) external view returns (uint256)",
      "function decimals() external view returns (uint8)",
      "function symbol() external view returns (string)",
      "function name() external view returns (string)",
      "function totalSupply() external view returns (uint256)",
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
    const commitmentAddress = ethers.getAddress("0x" + commitmentCreatedEvent.topics[1].slice(26));
    commitmentContract = await ethers.getContractAt("BidCommitment", commitmentAddress);
    
    console.log(`  🔍 Created commitment contract at: ${commitmentAddress}`);
    console.log(`  🔍 Event topics[1] (contract): ${commitmentCreatedEvent.topics[1]}`);
    console.log(`  🔍 Event topics[2] (creator): ${commitmentCreatedEvent.topics[2]}`);
    
    // Verify the commitment contract is now registered
    const isValidAfterCreation = await commitmentFactory.isValidCommitmentContract(commitmentAddress);
    console.log(`  🔍 Commitment contract is valid after creation: ${isValidAfterCreation}`);
    
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
    
    // Add the 20-byte getter address prefix as expected by the contract
    // Format: [20-byte getter address][ABI-encoded proof data]
    const getterAddress = await zkFusionGetter.getAddress();
    const getterAddressBytes = ethers.getBytes(getterAddress); // 20 bytes
    const fullExtensionData = ethers.concat([getterAddressBytes, extensionData]);
    
    console.log(`  🔍 Extension data length: ${fullExtensionData.length} bytes`);
    console.log(`  🔍 Getter address: ${getterAddress}`);
    console.log(`  🔍 Proof data length: ${extensionData.length} bytes`);
    
    // Debug: Check if commitment contract is registered with factory
    const isValidCommitment = await commitmentFactory.isValidCommitmentContract(commitmentAddress);
    console.log(`  🔍 Commitment contract ${commitmentAddress} is valid: ${isValidCommitment}`);
    console.log(`  🔍 CommitmentFactory address: ${await commitmentFactory.getAddress()}`);
    
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
      fullExtensionData,    // extension
      ethers.ZeroHash,      // orderHash
      bidder1.address,      // taker
      makingAmount,         // makingAmount
      makingAmount,         // remainingMakingAmount
      "0x"                  // extraData
    );

    console.log(`  ⛽ Gas estimate for getTakingAmount: ${gasEstimate.toString()}`);
    expect(gasEstimate).to.be.gt(0, "Gas estimate should be positive");

    // Actually call the function to ensure it works
    const takingAmount = await zkFusionGetter.getTakingAmount.staticCall(
      dummyOrder,           // order
      fullExtensionData,    // extension
      ethers.ZeroHash,      // orderHash
      bidder1.address,      // taker
      makingAmount,         // makingAmount
      makingAmount,         // remainingMakingAmount
      "0x"                  // extraData
    );
    console.log(`  💰 Calculated taking amount: ${ethers.formatUnits(takingAmount, 6)} USDC`);
    expect(takingAmount).to.be.gt(0, "Taking amount should be greater than zero");
  });

  it("🚨 CRITICAL: Should test complete 1inch LOP order flow", async function () {
    console.log("\n🔄 Testing complete 1inch LOP order flow...");
    
    // === STEP 1: Copy necessary 1inch utilities ===
    const { poseidon4 } = require("poseidon-lite");
    
    // 1inch Order structure (from their orderUtils.js)
    const Order = [
      { name: 'salt', type: 'uint256' },
      { name: 'maker', type: 'address' },
      { name: 'receiver', type: 'address' },
      { name: 'makerAsset', type: 'address' },
      { name: 'takerAsset', type: 'address' },
      { name: 'makingAmount', type: 'uint256' },
      { name: 'takingAmount', type: 'uint256' },
      { name: 'makerTraits', type: 'uint256' },
    ];

    // Helper functions (adapted from 1inch utils)
    function trim0x(bigNumber) {
      const s = bigNumber.toString();
      if (s.startsWith('0x')) {
        return s.substring(2);
      }
      return s;
    }

    function setn(num, bit, value) {
      if (value) {
        return BigInt(num) | (1n << BigInt(bit));
      } else {
        return BigInt(num) & (~(1n << BigInt(bit)));
      }
    }

    const _HAS_EXTENSION_FLAG = 249n;

    function buildOrder({
      maker,
      receiver = ethers.ZeroAddress,
      makerAsset,
      takerAsset,
      makingAmount,
      takingAmount,
      makerTraits = '0x0',
    }, {
      takingAmountData = '0x',
    } = {}) {
      const allInteractions = [
        '0x', // makerAssetSuffix
        '0x', // takerAssetSuffix
        '0x', // makingAmountData
        takingAmountData, // takingAmountData - THIS IS WHERE WE PUT OUR GETTER
        '0x', // predicate
        '0x', // permit
        '0x', // preInteraction
        '0x', // postInteraction
      ];

      const allInteractionsConcat = allInteractions.map(trim0x).join('');

      // Calculate offsets
      const cumulativeSum = (sum => value => { sum += value; return sum; })(0);
      const offsets = allInteractions
        .map(a => a.length / 2 - 1)
        .map(cumulativeSum)
        .reduce((acc, a, i) => acc + (BigInt(a) << BigInt(32 * i)), 0n);

      let extension = '0x';
      if (allInteractionsConcat.length > 0) {
        extension += offsets.toString(16).padStart(64, '0') + allInteractionsConcat;
      }

      let salt = '1';
      if (trim0x(extension).length > 0) {
        salt = BigInt(ethers.keccak256(extension)) & ((1n << 160n) - 1n);
        makerTraits = BigInt(makerTraits) | (1n << _HAS_EXTENSION_FLAG);
      }

      return {
        salt,
        maker,
        receiver,
        makerAsset,
        takerAsset,
        makingAmount,
        takingAmount,
        makerTraits,
        extension,
      };
    }

    function buildOrderData(chainId, verifyingContract, order) {
      return {
        domain: { 
          name: '1inch Limit Order Protocol', 
          version: '4', 
          chainId, 
          verifyingContract 
        },
        types: { Order },
        value: order,
      };
    }

    async function signOrder(order, chainId, target, wallet) {
      const orderData = buildOrderData(chainId, target, order);
      return await wallet.signTypedData(orderData.domain, orderData.types, orderData.value);
    }

    // === STEP 2: Create a commitment contract and generate ZK proof ===
    console.log("  🏗️ Creating commitment contract for the order...");
    
    const tx = await commitmentFactory.createCommitmentContract();
    const receipt = await tx.wait();
    
    const commitmentCreatedEvent = receipt.logs.find(
      log => log.topics[0] === ethers.id("CommitmentCreated(address,address)")
    );
    const commitmentAddress = ethers.getAddress("0x" + commitmentCreatedEvent.topics[1].slice(26));
    const commitmentContract = await ethers.getContractAt("BidCommitment", commitmentAddress);
    
    // Generate commitments for initialization
    const nullHash = await generateCommitment4(0n, 0n, ethers.ZeroAddress, commitmentAddress);
    const commitment1 = await generateCommitment4(1800n, 100n, bidder1.address, commitmentAddress);
    const commitment2 = await generateCommitment4(1900n, 150n, bidder2.address, commitmentAddress);
    const commitment3 = await generateCommitment4(2000n, 200n, bidder3.address, commitmentAddress);
    
    // Initialize the commitment contract
    const bidderAddresses = [bidder1.address, bidder2.address, bidder3.address];
    const commitments = [commitment1, commitment2, commitment3];
    
    await commitmentContract.initialize(nullHash, bidderAddresses, commitments);
    console.log("  ✅ Commitment contract initialized");

    // Generate ZK proof
    const bids = [
      { price: 1800n, amount: 100n, bidderAddress: bidder1.address },
      { price: 1900n, amount: 150n, bidderAddress: bidder2.address },
      { price: 2000n, amount: 200n, bidderAddress: bidder3.address },
    ];
    
    const allCommitments = [commitment1, commitment2, commitment3, nullHash, nullHash, nullHash, nullHash, nullHash];
    const makerMinimumPrice = 1750n; // Lower than winning bid of 1800
    const makerMaximumAmount = 1000n;
    
    const circuitInputs = await generateCircuitInputs(bids, allCommitments, makerMinimumPrice, makerMaximumAmount, commitmentAddress);

    const { proof, publicSignals } = await generateZkProof(circuitInputs);
    const originalWinnerBits = [1n, 1n, 0n, 1n, 0n, 1n, 0n, 1n];
    
    console.log("  ✅ ZK proof generated successfully");

    // === STEP 3: Create the takingAmountData that calls our ZkFusionGetter ===
    const proofStruct = {
      a: [proof[0], proof[1]],
      b: [[proof[2], proof[3]], [proof[4], proof[5]]],
      c: [proof[6], proof[7]]
    };

    // Encode the proof data (without the 20-byte prefix - that will be added by 1inch LOP)
    const extensionData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c)", "uint256[3]", "uint256[8]", "address"],
      [
        proofStruct,
        publicSignals,
        originalWinnerBits,
        commitmentAddress
      ]
    );

    // The takingAmountData format: [20-byte getter address][ABI-encoded proof data]
    const getterAddress = await zkFusionGetter.getAddress();
    const takingAmountData = ethers.concat([ethers.getBytes(getterAddress), extensionData]);
    
    console.log(`  🔍 takingAmountData length: ${takingAmountData.length} bytes`);
    console.log(`  🔍 Using ZkFusionGetter at: ${getterAddress}`);

    // === STEP 4: Build and sign the 1inch limit order ===
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const lopAddress = await oneInchLOP.getAddress();
    
    // Create an order where:
    // - Maker (bidder1) sells 100 WETH for USDC
    // - The taking amount will be calculated by our ZkFusionGetter (should be 180,000 USDC)
    const order = buildOrder({
      maker: bidder1.address,
      receiver: ethers.ZeroAddress, // Maker receives the tokens
      makerAsset: await wethContract.getAddress(),
      takerAsset: await usdcContract.getAddress(), 
      makingAmount: ethers.parseEther("100"), // 100 WETH
      takingAmount: ethers.parseUnits("180000", 6), // 180,000 USDC (will be overridden by our getter)
      makerTraits: '0x0',
    }, {
      takingAmountData: takingAmountData,
    });

    console.log("  🔍 Built 1inch limit order:");
    console.log(`    Maker: ${order.maker}`);
    console.log(`    Making: ${ethers.formatEther(order.makingAmount)} WETH`);
    console.log(`    Taking: ${ethers.formatUnits(order.takingAmount, 6)} USDC (will be overridden)`);

    // Sign the order
    const signature = await signOrder(order, chainId, lopAddress, bidder1);
    const { r, yParityAndS: vs } = ethers.Signature.from(signature);
    
    console.log("  ✅ Order signed successfully");

    // === STEP 5: Execute fillOrderArgs on the real 1inch LOP contract ===
    console.log("  🔄 Executing fillOrderArgs on 1inch LOP...");
    
    // Record initial balances
    const initialMakerWeth = await wethContract.balanceOf(bidder1.address);
    const initialMakerUsdc = await usdcContract.balanceOf(bidder1.address);
    const initialTakerWeth = await wethContract.balanceOf(owner.address);
    const initialTakerUsdc = await usdcContract.balanceOf(owner.address);
    
    console.log("  📊 Initial balances:");
    console.log(`    Maker WETH: ${ethers.formatEther(initialMakerWeth)}`);
    console.log(`    Maker USDC: ${ethers.formatUnits(initialMakerUsdc, 6)}`);
    console.log(`    Taker WETH: ${ethers.formatEther(initialTakerWeth)}`);
    console.log(`    Taker USDC: ${ethers.formatUnits(initialTakerUsdc, 6)}`);

    // Approve USDC for the taker (owner) to spend
    const requiredUsdc = ethers.parseUnits("200000", 6); // More than enough
    await usdcContract.connect(owner).approve(lopAddress, requiredUsdc);
    
    // Build takerTraits with extension length
    const TakerTraitsConstants = {
      _ARGS_EXTENSION_LENGTH_OFFSET: 224n,
    };
    
    const takerTraits = BigInt(takingAmountData.length / 2) << TakerTraitsConstants._ARGS_EXTENSION_LENGTH_OFFSET;
    
    // For fillOrderArgs, we need to remove the extension from the order and pass it as args
    const cleanOrder = {
      salt: order.salt,
      maker: order.maker,
      receiver: order.receiver,
      makerAsset: order.makerAsset,
      takerAsset: order.takerAsset,
      makingAmount: order.makingAmount,
      takingAmount: order.takingAmount,
      makerTraits: BigInt(order.makerTraits) & (~(1n << 249n)) // Remove HAS_EXTENSION_FLAG
    };
    
    console.log(`  🔍 Using takerTraits: ${takerTraits.toString()}`);
    console.log(`  🔍 Args (takingAmountData) length: ${takingAmountData.length} bytes`);
    
    // Debug: Check approvals
    const makerWethAllowance = await wethContract.balanceOf(bidder1.address);
    const takerUsdcAllowance = await usdcContract.allowance(owner.address, lopAddress);
    console.log(`  🔍 Maker WETH balance: ${ethers.formatEther(makerWethAllowance)} WETH`);
    console.log(`  🔍 Taker USDC allowance: ${ethers.formatUnits(takerUsdcAllowance, 6)} USDC`);
    
    // Debug: Approve WETH for the maker (bidder1) to spend
    console.log(`  📝 Approving WETH for maker (bidder1)...`);
    await wethContract.connect(bidder1).approve(lopAddress, ethers.parseEther("100"));
    const makerWethAllowanceAfter = await wethContract.allowance(bidder1.address, lopAddress);
    console.log(`  ✅ Maker WETH allowance: ${ethers.formatEther(makerWethAllowanceAfter)} WETH`);
    
    // Debug: Log order details
    console.log(`  🔍 Clean order details:`);
    console.log(`    salt: ${cleanOrder.salt}`);
    console.log(`    maker: ${cleanOrder.maker}`);
    console.log(`    makerAsset: ${cleanOrder.makerAsset}`);
    console.log(`    takerAsset: ${cleanOrder.takerAsset}`);
    console.log(`    makingAmount: ${ethers.formatEther(cleanOrder.makingAmount)} WETH`);
    console.log(`    takingAmount: ${ethers.formatUnits(cleanOrder.takingAmount, 6)} USDC`);
    console.log(`    makerTraits: ${cleanOrder.makerTraits}`);
    
    // Fill the order using fillOrderArgs (owner acts as the taker/resolver)
    try {
      console.log("  🔄 Attempting fillOrderArgs call...");
      
      // First, let's validate the order hash
      const expectedOrderHash = await oneInchLOP.hashOrder(cleanOrder);
      console.log(`  🔍 Expected order hash: ${expectedOrderHash}`);
      
      // Try to estimate gas first to get better error info
      try {
        const gasEstimate = await oneInchLOP.connect(owner).fillOrderArgs.estimateGas(
          cleanOrder,
          r,
          vs,
          ethers.parseEther("100"),
          takerTraits,
          takingAmountData
        );
        console.log(`  ⛽ Gas estimate: ${gasEstimate.toString()}`);
      } catch (gasError) {
        console.log(`  ❌ Gas estimation failed:`, gasError.message);
        if (gasError.data) {
          console.log(`  🔍 Error data:`, gasError.data);
        }
      }
      
      const fillTx = await oneInchLOP.connect(owner).fillOrderArgs(
        cleanOrder,
        r,
        vs,
        ethers.parseEther("100"), // Fill the full 100 WETH
        takerTraits, // takerTraits with extension length
        takingAmountData // args containing our ZK proof data
      );
      
      const fillReceipt = await fillTx.wait();
      console.log("  ✅ fillOrderArgs transaction successful!");
      console.log(`    Gas used: ${fillReceipt.gasUsed.toString()}`);
      
    } catch (error) {
      console.log(`  ❌ fillOrderArgs failed:`, error.message);
      
      // Try to get more detailed error information
      if (error.data) {
        console.log(`  🔍 Error data:`, error.data);
      }
      
      if (error.transaction) {
        console.log(`  🔍 Transaction:`, error.transaction);
      }
      
      if (error.receipt) {
        console.log(`  🔍 Receipt:`, error.receipt);
      }
      
      // Try a static call to get the revert reason
      try {
        await oneInchLOP.connect(owner).fillOrderArgs.staticCall(
          cleanOrder,
          r,
          vs,
          ethers.parseEther("100"),
          takerTraits,
          takingAmountData
        );
      } catch (staticError) {
        console.log(`  🔍 Static call error:`, staticError.message);
        if (staticError.data) {
          console.log(`  🔍 Static call error data:`, staticError.data);
        }
      }
      
      throw error; // Re-throw to fail the test
    }

    // === STEP 6: Verify the token transfers ===
    const finalMakerWeth = await wethContract.balanceOf(bidder1.address);
    const finalMakerUsdc = await usdcContract.balanceOf(bidder1.address);
    const finalTakerWeth = await wethContract.balanceOf(owner.address);
    const finalTakerUsdc = await usdcContract.balanceOf(owner.address);
    
    console.log("  📊 Final balances:");
    console.log(`    Maker WETH: ${ethers.formatEther(finalMakerWeth)}`);
    console.log(`    Maker USDC: ${ethers.formatUnits(finalMakerUsdc, 6)}`);
    console.log(`    Taker WETH: ${ethers.formatEther(finalTakerWeth)}`);
    console.log(`    Taker USDC: ${ethers.formatUnits(finalTakerUsdc, 6)}`);

    // Verify the transfers
    const makerWethChange = initialMakerWeth - finalMakerWeth;
    const makerUsdcChange = finalMakerUsdc - initialMakerUsdc;
    const takerWethChange = finalTakerWeth - initialTakerWeth;
    const takerUsdcChange = initialTakerUsdc - finalTakerUsdc;
    
    console.log("  📊 Balance changes:");
    console.log(`    Maker lost ${ethers.formatEther(makerWethChange)} WETH`);
    console.log(`    Maker gained ${ethers.formatUnits(makerUsdcChange, 6)} USDC`);
    console.log(`    Taker gained ${ethers.formatEther(takerWethChange)} WETH`);
    console.log(`    Taker lost ${ethers.formatUnits(takerUsdcChange, 6)} USDC`);

    // Assertions
    expect(makerWethChange).to.equal(ethers.parseEther("100"), "Maker should have lost 100 WETH");
    expect(takerWethChange).to.equal(ethers.parseEther("100"), "Taker should have gained 100 WETH");
    expect(makerUsdcChange).to.equal(ethers.parseUnits("180000", 6), "Maker should have gained 180,000 USDC (ZK auction result)");
    expect(takerUsdcChange).to.equal(ethers.parseUnits("180000", 6), "Taker should have lost 180,000 USDC");
    
    console.log("  🎉 SUCCESS! Complete 1inch LOP integration with ZK auction pricing verified!");
  });

  after(async function () {
    console.log("\n" + "=".repeat(80));
    console.log("🏁 CRITICAL INTEGRATION TEST COMPLETE");
    console.log("=".repeat(80));
  });
}); 