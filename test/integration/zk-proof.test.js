const { expect } = require("chai");
const { ethers } = require("hardhat");
const { hashBid, generateNonce } = require('../../circuits/utils/poseidon');
const { generateCircuitInputs, simulateAuction, verifyCommitments } = require('../../circuits/utils/input-generator');
const { generateProofWithData } = require('../../scripts/zk/generate-proof');
const { verifyProofData } = require('../../scripts/zk/verify-proof');
const fs = require('fs');
const path = require('path');

describe("ZK Proof Integration Tests", function () {
  let factory, executor, mockVerifier, mockLOP;
  let owner, bidder1, bidder2, bidder3, maker;
  let commitmentContract, commitmentAddress;

  // Increase timeout for ZK operations
  this.timeout(120000);

  before(async function () {
    [owner, bidder1, bidder2, bidder3, maker] = await ethers.getSigners();

    // Deploy contracts
    const CommitmentFactory = await ethers.getContractFactory("CommitmentFactory");
    factory = await CommitmentFactory.deploy();
    await factory.waitForDeployment();

    const MockVerifier = await ethers.getContractFactory("MockVerifier");
    mockVerifier = await MockVerifier.deploy();
    await mockVerifier.waitForDeployment();

    const MockLOP = await ethers.getContractFactory("MockLimitOrderProtocol");
    mockLOP = await MockLOP.deploy();
    await mockLOP.waitForDeployment();

    const zkFusionExecutor = await ethers.getContractFactory("zkFusionExecutor");
    executor = await zkFusionExecutor.deploy(
      await mockVerifier.getAddress(),
      await factory.getAddress(),
      await mockLOP.getAddress()
    );
    await executor.waitForDeployment();

    // Create commitment contract
    const createTx = await factory.createCommitmentContract();
    const createReceipt = await createTx.wait();
    const createEvent = createReceipt.logs.find(log => {
      try {
        return factory.interface.parseLog(log).name === 'CommitmentCreated';
      } catch {
        return false;
      }
    });
    commitmentAddress = factory.interface.parseLog(createEvent).args.commitmentContract;
    commitmentContract = await ethers.getContractAt("BidCommitment", commitmentAddress);
  });

  describe("Poseidon Hash Integration", function () {
    it("Should generate valid Poseidon hashes", async function () {
      const price = 1000n;
      const amount = 100n;
      const nonce = generateNonce();

      const hash1 = await hashBid(price, amount, nonce);
      const hash2 = await hashBid(price, amount, nonce);

      expect(hash1).to.equal(hash2);
      expect(hash1).to.be.a('string');
      expect(hash1.length).to.be.greaterThan(0);
    });

    it("Should generate different hashes for different inputs", async function () {
      const nonce = generateNonce();
      
      const hash1 = await hashBid(1000n, 100n, nonce);
      const hash2 = await hashBid(1001n, 100n, nonce);
      const hash3 = await hashBid(1000n, 101n, nonce);

      expect(hash1).to.not.equal(hash2);
      expect(hash1).to.not.equal(hash3);
      expect(hash2).to.not.equal(hash3);
    });

    it("Should verify commitments correctly", async function () {
      const bids = [
        { price: 1200n, amount: 100n, nonce: generateNonce() },
        { price: 1100n, amount: 150n, nonce: generateNonce() }
      ];

      const commitments = [];
      for (const bid of bids) {
        const commitment = await hashBid(bid.price, bid.amount, bid.nonce);
        commitments.push(commitment);
      }

      const isValid = await verifyCommitments(bids, commitments);
      expect(isValid).to.be.true;
    });
  });

  describe("Circuit Input Generation", function () {
    it("Should generate valid circuit inputs", async function () {
      const bids = [
        { price: 1200n, amount: 100n, nonce: generateNonce(), bidder: bidder1.address },
        { price: 1100n, amount: 150n, nonce: generateNonce(), bidder: bidder2.address }
      ];

      const commitments = [];
      for (const bid of bids) {
        const commitment = await hashBid(bid.price, bid.amount, bid.nonce);
        commitments.push(commitment);
      }

      // Pad to 4 elements
      while (commitments.length < 4) {
        commitments.push('0');
      }

      const makerAsk = 300n;
      const inputs = await generateCircuitInputs(bids, commitments, makerAsk, commitmentAddress);

      expect(inputs).to.have.property('bidPrices');
      expect(inputs).to.have.property('bidAmounts');
      expect(inputs).to.have.property('nonces');
      expect(inputs).to.have.property('commitments');
      expect(inputs).to.have.property('makerAsk');
      expect(inputs).to.have.property('commitmentContractAddress');

      expect(inputs.bidPrices).to.have.length(4);
      expect(inputs.bidAmounts).to.have.length(4);
      expect(inputs.nonces).to.have.length(4);
      expect(inputs.commitments).to.have.length(4);
    });

    it("Should simulate auction correctly", async function () {
      const bids = [
        { price: 1200n, amount: 100n, nonce: generateNonce(), bidder: bidder1.address },
        { price: 1100n, amount: 150n, nonce: generateNonce(), bidder: bidder2.address },
        { price: 1000n, amount: 200n, nonce: generateNonce(), bidder: bidder3.address }
      ];

      const makerAsk = 300n;
      const results = simulateAuction(bids, makerAsk);

      expect(results.winners).to.have.length(2); // First two bids should win
      expect(results.totalFill).to.equal(250n); // 100 + 150
      expect(results.weightedAvgPrice).to.equal(1140n); // (1200*100 + 1100*150) / 250
    });
  });

  describe("ZK Proof Generation (Requires Circuit Setup)", function () {
    before(function () {
      // Check if circuit artifacts exist
      const circuitsDir = path.join(__dirname, '../../circuits');
      const wasmPath = path.join(circuitsDir, 'zkDutchAuction_js/zkDutchAuction.wasm');
      const zkeyPath = path.join(circuitsDir, 'circuit_final.zkey');
      
      if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
        this.skip();
      }
    });

    it("Should generate valid ZK proof", async function () {
      const bids = [
        { price: 1200n, amount: 100n, nonce: generateNonce(), bidder: bidder1.address },
        { price: 1100n, amount: 150n, nonce: generateNonce(), bidder: bidder2.address }
      ];

      const commitments = [];
      for (const bid of bids) {
        const commitment = await hashBid(bid.price, bid.amount, bid.nonce);
        commitments.push(commitment);
      }

      // Pad to 4 elements
      while (commitments.length < 4) {
        commitments.push('0');
      }

      const makerAsk = 300n;

      const proofData = await generateProofWithData(
        bids,
        commitments,
        makerAsk,
        commitmentAddress
      );

      expect(proofData).to.have.property('proof');
      expect(proofData).to.have.property('publicSignals');
      expect(proofData.proof).to.have.length(8);
      expect(proofData.publicSignals).to.have.length(8);

      // Verify proof structure
      for (const component of proofData.proof) {
        expect(component).to.be.a('string');
      }

      for (const signal of proofData.publicSignals) {
        expect(signal).to.be.a('string');
      }
    });

    it("Should verify generated proof", async function () {
      const bids = [
        { price: 1200n, amount: 100n, nonce: generateNonce(), bidder: bidder1.address }
      ];

      const commitments = [];
      for (const bid of bids) {
        const commitment = await hashBid(bid.price, bid.amount, bid.nonce);
        commitments.push(commitment);
      }

      // Pad to 4 elements
      while (commitments.length < 4) {
        commitments.push('0');
      }

      const makerAsk = 150n;

      const proofData = await generateProofWithData(
        bids,
        commitments,
        makerAsk,
        commitmentAddress
      );

      // Load verification key
      const vkeyPath = path.join(__dirname, '../../circuits/verification_key.json');
      if (!fs.existsSync(vkeyPath)) {
        this.skip();
      }

      const vKey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));
      
      const isValid = await verifyProofData(
        proofData.rawProof,
        proofData.publicSignals,
        vKey
      );

      expect(isValid).to.be.true;
    });

    it("Should reject invalid proof", async function () {
      const bids = [
        { price: 1200n, amount: 100n, nonce: generateNonce(), bidder: bidder1.address }
      ];

      const commitments = [];
      for (const bid of bids) {
        const commitment = await hashBid(bid.price, bid.amount, bid.nonce);
        commitments.push(commitment);
      }

      // Pad to 4 elements
      while (commitments.length < 4) {
        commitments.push('0');
      }

      const makerAsk = 150n;

      const proofData = await generateProofWithData(
        bids,
        commitments,
        makerAsk,
        commitmentAddress
      );

      // Tamper with public signals
      const tamperedSignals = [...proofData.publicSignals];
      tamperedSignals[4] = '999'; // Change total fill

      // Load verification key
      const vkeyPath = path.join(__dirname, '../../circuits/verification_key.json');
      if (!fs.existsSync(vkeyPath)) {
        this.skip();
      }

      const vKey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));
      
      const isValid = await verifyProofData(
        proofData.rawProof,
        tamperedSignals,
        vKey
      );

      expect(isValid).to.be.false;
    });
  });

  describe("Full Integration with Contracts", function () {
    it("Should execute full auction flow with commitments", async function () {
      const bids = [
        { price: 1200n, amount: 100n, nonce: generateNonce(), bidder: bidder1.address },
        { price: 1100n, amount: 150n, nonce: generateNonce(), bidder: bidder2.address }
      ];

      // Submit commitments on-chain
      const commitments = [];
      for (const bid of bids) {
        const commitment = await hashBid(bid.price, bid.amount, bid.nonce);
        commitments.push(commitment);
        
        const commitTx = await commitmentContract.connect(bid.bidder).commit(
          '0x' + BigInt(commitment).toString(16).padStart(64, '0')
        );
        await commitTx.wait();
      }

      // Verify commitments were stored correctly
      for (let i = 0; i < bids.length; i++) {
        const storedCommitment = await commitmentContract.getCommitment(bids[i].bidder);
        const expectedCommitment = '0x' + BigInt(commitments[i]).toString(16).padStart(64, '0');
        expect(storedCommitment).to.equal(expectedCommitment);
      }

      // Verify commitment verification works
      const isValid = await verifyCommitments(bids, commitments);
      expect(isValid).to.be.true;
    });

    it("Should handle edge cases in auction simulation", async function () {
      // Test with no bids
      let results = simulateAuction([], 1000n);
      expect(results.winners).to.have.length(0);
      expect(results.totalFill).to.equal(0n);
      expect(results.weightedAvgPrice).to.equal(0n);

      // Test with bids exceeding maker ask
      const largeBids = [
        { price: 1000n, amount: 500n, nonce: generateNonce(), bidder: bidder1.address },
        { price: 900n, amount: 600n, nonce: generateNonce(), bidder: bidder2.address }
      ];

      results = simulateAuction(largeBids, 800n);
      expect(results.winners).to.have.length(1); // Only first bid should fit
      expect(results.totalFill).to.equal(500n);
    });
  });

  describe("Error Handling", function () {
    it("Should handle invalid field elements", async function () {
      const invalidBids = [
        { 
          price: BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495618"), // > field size
          amount: 100n, 
          nonce: generateNonce(), 
          bidder: bidder1.address 
        }
      ];

      const commitments = ['0', '0', '0', '0'];

      await expect(
        generateCircuitInputs(invalidBids, commitments, 100n, commitmentAddress)
      ).to.be.rejectedWith('Invalid field element');
    });

    it("Should handle mismatched commitment arrays", async function () {
      const bids = [
        { price: 1000n, amount: 100n, nonce: generateNonce(), bidder: bidder1.address }
      ];

      const wrongCommitments = ['0', '0']; // Wrong length

      await expect(
        generateCircuitInputs(bids, wrongCommitments, 100n, commitmentAddress)
      ).to.be.rejectedWith('Commitments array must have exactly 4 elements');
    });

    it("Should handle too many bids", async function () {
      const tooManyBids = Array(5).fill().map((_, i) => ({
        price: BigInt(1000 + i),
        amount: 100n,
        nonce: generateNonce(),
        bidder: bidder1.address
      }));

      const commitments = ['0', '0', '0', '0'];

      await expect(
        generateCircuitInputs(tooManyBids, commitments, 100n, commitmentAddress)
      ).to.be.rejectedWith('Too many bids. Maximum 4 bids supported');
    });
  });
}); 