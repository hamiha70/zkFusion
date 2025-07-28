const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("zkFusion", function () {
  let factory, executor, mockVerifier, mockLOP;
  let owner, bidder1, bidder2, bidder3, bidder4, maker;
  let commitmentContract, commitmentAddress;

  // Mock Poseidon hash function for testing
  function mockPoseidonHash(price, amount, nonce) {
    return ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "uint256", "uint256"],
      [price, amount, nonce]
    ));
  }

  beforeEach(async function () {
    [owner, bidder1, bidder2, bidder3, bidder4, maker] = await ethers.getSigners();

    // Deploy CommitmentFactory
    const CommitmentFactory = await ethers.getContractFactory("CommitmentFactory");
    factory = await CommitmentFactory.deploy();
    await factory.waitForDeployment();

    // Deploy MockVerifier
    const MockVerifier = await ethers.getContractFactory("MockVerifier");
    mockVerifier = await MockVerifier.deploy();
    await mockVerifier.waitForDeployment();

    // Deploy MockLimitOrderProtocol
    const MockLOP = await ethers.getContractFactory("MockLimitOrderProtocol");
    mockLOP = await MockLOP.deploy();
    await mockLOP.waitForDeployment();

    // Deploy zkFusionExecutor
    const zkFusionExecutor = await ethers.getContractFactory("zkFusionExecutor");
    executor = await zkFusionExecutor.deploy(
      await mockLOP.getAddress(),
      await mockVerifier.getAddress(),
      await factory.getAddress()
    );
    await executor.waitForDeployment();

    // Create a commitment contract
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

  describe("CommitmentFactory", function () {
    it("Should deploy commitment contracts", async function () {
      const initialCount = await factory.getCommitmentCount();
      
      const tx = await factory.connect(bidder1).createCommitmentContract();
      const receipt = await tx.wait();
      
      expect(await factory.getCommitmentCount()).to.equal(initialCount + 1n);
      
      // Check event emission
      const event = receipt.logs.find(log => {
        try {
          return factory.interface.parseLog(log).name === 'CommitmentCreated';
        } catch {
          return false;
        }
      });
      expect(event).to.not.be.undefined;
      
      const parsedEvent = factory.interface.parseLog(event);
      expect(parsedEvent.args.creator).to.equal(bidder1.address);
    });

    it("Should track valid commitment contracts", async function () {
      const tx = await factory.createCommitmentContract();
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return factory.interface.parseLog(log).name === 'CommitmentCreated';
        } catch {
          return false;
        }
      });
      const newContractAddress = factory.interface.parseLog(event).args.commitmentContract;
      
      expect(await factory.isValidCommitmentContract(newContractAddress)).to.be.true;
      expect(await factory.isValidCommitmentContract(ethers.ZeroAddress)).to.be.false;
    });
  });

  describe("BidCommitment", function () {
    it("Should allow bidders to commit", async function () {
      const commitment = mockPoseidonHash(1000n, 100n, 12345n);
      
      await expect(commitmentContract.connect(bidder1).commit(commitment))
        .to.emit(commitmentContract, "BidCommitted")
        .withArgs(bidder1.address, commitment, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));
      
      expect(await commitmentContract.getCommitment(bidder1.address)).to.equal(commitment);
      expect(await commitmentContract.hasCommitted(bidder1.address)).to.be.true;
    });

    it("Should prevent double commitments", async function () {
      const commitment = mockPoseidonHash(1000n, 100n, 12345n);
      
      await commitmentContract.connect(bidder1).commit(commitment);
      
      await expect(commitmentContract.connect(bidder1).commit(commitment))
        .to.be.revertedWith("Already committed");
    });

    it("Should reject zero commitments", async function () {
      await expect(commitmentContract.connect(bidder1).commit(ethers.ZeroHash))
        .to.be.revertedWith("Invalid commitment hash");
    });

    it("Should track commitment timestamps", async function () {
      const commitment = mockPoseidonHash(1000n, 100n, 12345n);
      
      const tx = await commitmentContract.connect(bidder1).commit(commitment);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      
      expect(await commitmentContract.getCommitmentTimestamp(bidder1.address))
        .to.equal(block.timestamp);
    });
  });

  describe("zkFusionExecutor", function () {
    let mockOrder, mockSignature;
    let bids, commitments, mockProof, publicInputs, winnerAddresses;

    beforeEach(async function () {
      // Setup mock order with new 1inch LOP v4 format
      mockOrder = {
        salt: 123456789n,
        maker: maker.address,
        receiver: maker.address,
        makerAsset: "0x1234567890123456789012345678901234567890",
        takerAsset: "0x0987654321098765432109876543210987654321",
        makingAmount: 1000n,
        takingAmount: 400n,
        makerTraits: 0n // No special traits for testing
      };
      mockSignature = "0x1234";

      // Setup bids and commitments
      bids = [
        { bidder: bidder1, price: 1200n, amount: 100n, nonce: 12345n },
        { bidder: bidder2, price: 1150n, amount: 150n, nonce: 23456n },
        { bidder: bidder3, price: 1100n, amount: 200n, nonce: 34567n },
        { bidder: bidder4, price: 1050n, amount: 250n, nonce: 45678n },
      ];

      commitments = [];
      for (const bid of bids) {
        const commitment = mockPoseidonHash(bid.price, bid.amount, bid.nonce);
        commitments.push(commitment);
        await commitmentContract.connect(bid.bidder).commit(commitment);
      }

      // Mock proof and public inputs
      mockProof = [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n];
      publicInputs = [
        ...commitments,
        250n, // totalFill
        1160n, // weightedAvgPrice
        400n, // makerAsk
        BigInt(commitmentAddress)
      ];
      winnerAddresses = [bidder1.address, bidder2.address, ethers.ZeroAddress, ethers.ZeroAddress];
    });

    it("Should execute auction with valid proof", async function () {
      await expect(executor.executeWithProof(
        mockProof,
        publicInputs,
        winnerAddresses,
        commitmentAddress,
        mockOrder,
        mockSignature
      )).to.emit(executor, "AuctionExecuted");
    });

    it("Should verify commitment contract is from factory", async function () {
      // Create a fake commitment contract not from factory
      const BidCommitment = await ethers.getContractFactory("BidCommitment");
      const fakeContract = await BidCommitment.deploy(owner.address);
      await fakeContract.waitForDeployment();
      
      await expect(executor.executeWithProof(
        mockProof,
        publicInputs,
        winnerAddresses,
        await fakeContract.getAddress(),
        mockOrder,
        mockSignature
      )).to.be.revertedWith("Invalid commitment contract");
    });

    it("Should verify commitment contract address matches public input", async function () {
      const wrongPublicInputs = [...publicInputs];
      wrongPublicInputs[7] = 123456n; // Wrong contract address
      
      await expect(executor.executeWithProof(
        mockProof,
        wrongPublicInputs,
        winnerAddresses,
        commitmentAddress,
        mockOrder,
        mockSignature
      )).to.be.revertedWith("Commitment contract address mismatch");
    });

    it("Should verify winner commitments match on-chain data", async function () {
      // Submit a different commitment for bidder1
      const wrongCommitment = mockPoseidonHash(999n, 50n, 11111n);
      const wrongPublicInputs = [...publicInputs];
      wrongPublicInputs[0] = wrongCommitment;
      
      await expect(executor.executeWithProof(
        mockProof,
        wrongPublicInputs,
        winnerAddresses,
        commitmentAddress,
        mockOrder,
        mockSignature
      )).to.be.revertedWith("Commitment mismatch for winner");
    });

    it("Should reject invalid ZK proofs", async function () {
      // Set mock verifier to return false
      await mockVerifier.setReturnValue(false);
      
      await expect(executor.executeWithProof(
        mockProof,
        publicInputs,
        winnerAddresses,
        commitmentAddress,
        mockOrder,
        mockSignature
      )).to.be.revertedWith("Invalid ZK proof");
      
      // Reset for other tests
      await mockVerifier.setReturnValue(true);
    });

    it("Should reject zero fill amounts", async function () {
      const zeroFillInputs = [...publicInputs];
      zeroFillInputs[4] = 0n; // totalFill = 0
      
      await expect(executor.executeWithProof(
        mockProof,
        zeroFillInputs,
        winnerAddresses,
        commitmentAddress,
        mockOrder,
        mockSignature
      )).to.be.revertedWith("No fill amount");
    });

    it("Should reject fills exceeding order amount", async function () {
      const excessiveFillInputs = [...publicInputs];
      excessiveFillInputs[4] = 1500n; // totalFill > order.makingAmount (1000n)
      
      await expect(executor.executeWithProof(
        mockProof,
        excessiveFillInputs,
        winnerAddresses,
        commitmentAddress,
        mockOrder,
        mockSignature
      )).to.be.revertedWith("Fill exceeds order amount");
    });

    it("Should handle winners with no commitment gracefully", async function () {
      const winnersWithZero = [bidder1.address, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress];
      
      await expect(executor.executeWithProof(
        mockProof,
        publicInputs,
        winnersWithZero,
        commitmentAddress,
        mockOrder,
        mockSignature
      )).to.emit(executor, "AuctionExecuted");
    });
  });

  describe("MockLimitOrderProtocol", function () {
    it("Should fill orders correctly", async function () {
      const order = {
        salt: 123456789n,
        maker: maker.address,
        receiver: maker.address,
        makerAsset: "0x1234567890123456789012345678901234567890",
        takerAsset: "0x0987654321098765432109876543210987654321",
        makingAmount: 1000n,
        takingAmount: 400n,
        makerTraits: 0n // No special traits for this test
      };

      // Use the new fillContractOrder method with proper signature
      const [makingAmount, takingAmount, orderHash] = await mockLOP.fillContractOrder.staticCall(
        order,
        "0x1234", // signature
        200n, // amount
        0n // takerTraits
      );

      expect(takingAmount).to.equal(200n);
      expect(makingAmount).to.equal(500n); // Proportional: (1000 * 200) / 400
    });

    it("Should track filled amounts", async function () {
      const order = {
        salt: 123456789n,
        maker: maker.address,
        receiver: maker.address,
        makerAsset: "0x1234567890123456789012345678901234567890",
        takerAsset: "0x0987654321098765432109876543210987654321",
        makingAmount: 1000n,
        takingAmount: 400n,
        makerTraits: 0n // No special traits for this test
      };

      await mockLOP.fillContractOrder(order, "0x1234", 200n, 0n);
      
      const orderHash = await mockLOP.hashOrder(order);
      expect(await mockLOP.getFilledAmount(orderHash)).to.equal(200n);
      expect(await mockLOP.isOrderFilled(order)).to.be.false;
      
      await mockLOP.fillContractOrder(order, "0x1234", 200n, 0n);
      
      expect(await mockLOP.getFilledAmount(orderHash)).to.equal(400n);
      expect(await mockLOP.isOrderFilled(order)).to.be.true;
    });
  });

  describe("Integration Test", function () {
    it("Should execute complete auction flow", async function () {
      // This test simulates the complete zkFusion flow
      const bids = [
        { bidder: bidder1, price: 1200n, amount: 100n, nonce: 12345n },
        { bidder: bidder2, price: 1150n, amount: 150n, nonce: 23456n },
        { bidder: bidder3, price: 1100n, amount: 200n, nonce: 34567n },
      ];

      // Step 1: Bidders commit
      const commitments = [];
      for (const bid of bids) {
        const commitment = mockPoseidonHash(bid.price, bid.amount, bid.nonce);
        commitments.push(commitment);
        await commitmentContract.connect(bid.bidder).commit(commitment);
      }

      // Step 2: Create order
      const order = {
        salt: 123456789n,
        maker: maker.address,
        receiver: maker.address,
        makerAsset: "0x1234567890123456789012345678901234567890",
        takerAsset: "0x0987654321098765432109876543210987654321",
        makingAmount: 1000n,
        takingAmount: 300n, // Can fill 300 tokens
        makerTraits: 0n // No special traits for this test
      };

      // Step 3: Simulate auction (select top 2 bids: 100 + 150 = 250)
      const totalFill = 250n;
      const weightedAvgPrice = (1200n * 100n + 1150n * 150n) / 250n; // 1170
      
      // Pad commitments array to 4 elements
      while (commitments.length < 4) {
        commitments.push(ethers.ZeroHash);
      }

      const publicInputs = [
        ...commitments,
        totalFill,
        weightedAvgPrice,
        order.takingAmount,
        BigInt(commitmentAddress)
      ];

      const winnerAddresses = [
        bidder1.address,
        bidder2.address,
        ethers.ZeroAddress,
        ethers.ZeroAddress
      ];

      // Step 4: Execute with proof
      const mockProof = [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n];
      
      const tx = await executor.executeWithProof(
        mockProof,
        publicInputs,
        winnerAddresses,
        commitmentAddress,
        order,
        "0x1234"
      );

      const receipt = await tx.wait();

      // Verify events
      const auctionEvent = receipt.logs.find(log => {
        try {
          return executor.interface.parseLog(log).name === 'AuctionExecuted';
        } catch {
          return false;
        }
      });
      expect(auctionEvent).to.not.be.undefined;

      const lopEvent = receipt.logs.find(log => {
        try {
          return mockLOP.interface.parseLog(log).name === 'OrderFilled';
        } catch {
          return false;
        }
      });
      expect(lopEvent).to.not.be.undefined;

      // Verify order was filled in LOP
      const orderHash = await mockLOP.hashOrder(order);
      expect(await mockLOP.getFilledAmount(orderHash)).to.equal(totalFill);
    });
  });
}); 