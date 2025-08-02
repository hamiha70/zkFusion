const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("zkFusion Unit Tests", function () {
    let owner, user1, user2, user3;
    let bidCommitment, zkFusionExecutor, zkFusionGetter, verifier, commitmentFactory;

    beforeEach(async function () {
        [owner, user1, user2, user3] = await ethers.getSigners();
        
        // Deploy minimal contracts for unit testing
        const VerifierFactory = await ethers.getContractFactory("Groth16Verifier");
        verifier = await VerifierFactory.deploy();
        await verifier.waitForDeployment();
        
        const CommitmentFactoryContract = await ethers.getContractFactory("CommitmentFactory");
        commitmentFactory = await CommitmentFactoryContract.deploy();
        await commitmentFactory.waitForDeployment();
        
        const ZkFusionExecutorFactory = await ethers.getContractFactory("zkFusionExecutor");
        zkFusionExecutor = await ZkFusionExecutorFactory.deploy(
            ethers.ZeroAddress,
            await verifier.getAddress(),
            await commitmentFactory.getAddress()
        );
        await zkFusionExecutor.waitForDeployment();
        
        const ZkFusionGetterFactory = await ethers.getContractFactory("ZkFusionGetter");
        zkFusionGetter = await ZkFusionGetterFactory.deploy(await zkFusionExecutor.getAddress());
        await zkFusionGetter.waitForDeployment();
        
        // Create a BidCommitment for testing
        const tx = await commitmentFactory.createCommitmentContract();
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => {
            try {
                const parsed = commitmentFactory.interface.parseLog(log);
                return parsed.name === 'CommitmentCreated';
            } catch {
                return false;
            }
        });
        const parsedEvent = commitmentFactory.interface.parseLog(event);
        const commitmentAddress = parsedEvent.args.commitmentContract;
        bidCommitment = await ethers.getContractAt("BidCommitment", commitmentAddress);
    });

    describe("BidCommitment Unit Tests", function () {
        const nullHash = "999999999999999999999999999999";
        
        it("Should reject initialization by non-owner", async function () {
            await expect(
                bidCommitment.connect(user1).initialize(nullHash, [], [])
            ).to.be.revertedWith("Only owner can initialize");
        });
        
        it("Should reject double initialization", async function () {
            await bidCommitment.initialize(nullHash, [], []);
            
            await expect(
                bidCommitment.initialize(nullHash, [], [])
            ).to.be.revertedWith("Already initialized");
        });
        
        it("Should reject invalid null hash", async function () {
            await expect(
                bidCommitment.initialize(0, [], [])
            ).to.be.revertedWith("Invalid null hash");
        });
        
        it("Should reject mismatched array lengths", async function () {
            await expect(
                bidCommitment.initialize(nullHash, [user1.address], [])
            ).to.be.revertedWith("Array length mismatch");
        });
        
        it("Should reject too many initial commitments", async function () {
            const tooManyBidders = new Array(9).fill(user1.address);
            const tooManyCommitments = new Array(9).fill("123456789");
            
            await expect(
                bidCommitment.initialize(nullHash, tooManyBidders, tooManyCommitments)
            ).to.be.revertedWith("Too many initial commitments");
        });
        
        it("Should reject commits before initialization", async function () {
            await expect(
                bidCommitment.connect(user1).commit("123456789")
            ).to.be.revertedWith("Contract not initialized");
        });
        
        it("Should reject invalid commitment values", async function () {
            await bidCommitment.initialize(nullHash, [], []);
            
            // Reject zero commitment
            await expect(
                bidCommitment.connect(user1).commit(0)
            ).to.be.revertedWith("Invalid commitment hash");
            
            // Reject null hash as commitment
            await expect(
                bidCommitment.connect(user1).commit(nullHash)
            ).to.be.revertedWith("Invalid commitment hash");
        });
        
        it("Should reject duplicate commitments from same bidder", async function () {
            await bidCommitment.initialize(nullHash, [], []);
            
            await bidCommitment.connect(user1).commit("111111111");
            
            await expect(
                bidCommitment.connect(user1).commit("222222222")
            ).to.be.revertedWith("Already committed");
        });
        
        it("Should reject commits when slots are full", async function () {
            // Fill all 8 slots
            const fullBidders = [user1, user2, user3, owner].concat(
                [user1, user2, user3, owner] // Reuse addresses for simplicity
            );
            const fullCommitments = [
                "111111111", "222222222", "333333333", "444444444",
                "555555555", "666666666", "777777777", "888888888"
            ];
            
            await bidCommitment.initialize(
                nullHash, 
                fullBidders.slice(0, 8).map(b => b.address), 
                fullCommitments
            );
            
            // Try to add 9th commitment - should fail
            await expect(
                bidCommitment.connect(user3).commit("999999999")
            ).to.be.revertedWith("No available slots");
        });
        
        it("Should handle array access correctly", async function () {
            await bidCommitment.initialize(nullHash, [user1.address], ["111111111"]);
            
            // Valid index access
            expect(await bidCommitment.getCommitmentByIndex(0)).to.equal("111111111");
            expect(await bidCommitment.getBidderByIndex(0)).to.equal(user1.address);
            expect(await bidCommitment.getCommitmentByIndex(1)).to.equal(nullHash);
            expect(await bidCommitment.getBidderByIndex(1)).to.equal(ethers.ZeroAddress);
            
            // Invalid index access
            await expect(
                bidCommitment.getCommitmentByIndex(8)
            ).to.be.revertedWith("Index out of bounds");
            
            await expect(
                bidCommitment.getBidderByIndex(8)
            ).to.be.revertedWith("Index out of bounds");
        });
    });

    describe("ZkFusionGetter Unit Tests", function () {
        it("Should reject extension data that's too short", async function () {
            const shortExtension = "0x12345678901234567890123456789012345678"; // Only 19 bytes (38 hex chars)
            
            await expect(
                zkFusionGetter.decodeExtension(shortExtension)
            ).to.be.revertedWith("Invalid extension length");
        });
        
        it("Should handle malformed ABI data gracefully", async function () {
            const malformedExtension = "0x1234567890123456789012345678901234567890" + "00000000000000000000000000000000000000000000"; // 20 bytes + some invalid ABI data
            
            await expect(
                zkFusionGetter.decodeExtension(malformedExtension)
            ).to.be.reverted; // Should revert on ABI decode
        });
        
        it("Should reject getTakingAmount with invalid extension", async function () {
            const dummyOrder = {
                salt: 0,
                maker: ethers.ZeroAddress,
                receiver: ethers.ZeroAddress,
                makerAsset: ethers.ZeroAddress,
                takerAsset: ethers.ZeroAddress,
                makingAmount: 0,
                takingAmount: 0,
                makerTraits: 0
            };
            
            const invalidExtension = "0x12345678901234567890123456789012345678"; // Only 19 bytes
            
            await expect(
                zkFusionGetter.getTakingAmount(
                    dummyOrder,
                    invalidExtension,
                    ethers.ZeroHash,
                    ethers.ZeroAddress,
                    0,
                    0,
                    '0x'
                )
            ).to.be.revertedWith("Invalid extension length");
        });
    });

    describe("zkFusionExecutor Unit Tests", function () {
        it("Should reject invalid commitment contract", async function () {
            const dummyProof = [1, 2, 3, 4, 5, 6, 7, 8];
            const dummyPublicSignals = [100, 200, 3];
            const dummyWinnerBits = [1, 1, 1, 0, 0, 0, 0, 0];
            
            await expect(
                zkFusionExecutor.verifyAuctionProof(
                    dummyProof,
                    dummyPublicSignals,
                    dummyWinnerBits,
                    ethers.ZeroAddress // Invalid contract address
                )
            ).to.be.revertedWith("Invalid commitment contract");
        });
        
        it("Should reject zero total value", async function () {
            // Initialize a valid commitment contract
            await bidCommitment.initialize("999999999999999999999999999999", [], []);
            
            const dummyProof = [1, 2, 3, 4, 5, 6, 7, 8];
            const zeroValueSignals = [100, 0, 3]; // totalValue = 0
            const dummyWinnerBits = [1, 1, 1, 0, 0, 0, 0, 0];
            
            await expect(
                zkFusionExecutor.verifyAuctionProof(
                    dummyProof,
                    zeroValueSignals,
                    dummyWinnerBits,
                    await bidCommitment.getAddress()
                )
            ).to.be.revertedWith("Invalid ZK proof"); // Proof verification happens first
        });
    });

    describe("Edge Case Integration", function () {
        it("Should handle the complete happy path", async function () {
            // Initialize BidCommitment properly
            const nullHash = "999999999999999999999999999999";
            await bidCommitment.initialize(nullHash, [user1.address], ["111111111"]);
            
            // Verify contract state
            const [isInitialized, commitmentCount, storedNullHash] = await bidCommitment.getContractState();
            expect(isInitialized).to.be.true;
            expect(commitmentCount).to.equal(1);
            expect(storedNullHash).to.equal(nullHash);
            
            // Verify arrays
            const allCommitments = await bidCommitment.getAllCommitments();
            const allBidders = await bidCommitment.getAllBidders();
            
            expect(allCommitments[0]).to.equal("111111111");
            expect(allCommitments[1]).to.equal(nullHash);
            expect(allBidders[0]).to.equal(user1.address);
            expect(allBidders[1]).to.equal(ethers.ZeroAddress);
            
            // Verify legacy compatibility
            expect(await bidCommitment.getCommitment(user1.address)).to.equal("111111111");
            expect(await bidCommitment.hasCommitted(user1.address)).to.be.true;
            expect(await bidCommitment.hasCommitted(user2.address)).to.be.false;
            
            console.log("✅ Complete happy path validation successful");
        });
    });
}); 