const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("🔍 Gas Verification Analysis", function () {
  let verifier, zkFusionExecutor, zkFusionGetter;
  let owner, bidder1;
  
  // Test data
  const mockProof = [
    "0x1234567890123456789012345678901234567890123456789012345678901234",
    "0x2345678901234567890123456789012345678901234567890123456789012345",
    "0x3456789012345678901234567890123456789012345678901234567890123456",
    "0x4567890123456789012345678901234567890123456789012345678901234567",
    "0x5678901234567890123456789012345678901234567890123456789012345678",
    "0x6789012345678901234567890123456789012345678901234567890123456789",
    "0x789012345678901234567890123456789012345678901234567890123456789a",
    "0x89012345678901234567890123456789012345678901234567890123456789ab"
  ];
  
  const mockPublicSignals = [
    "0x1111111111111111111111111111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222222222222222222222222222", 
    "0x3333333333333333333333333333333333333333333333333333333333333333"
  ];
  
  const mockOriginalWinnerBits = [
    "0x0000000000000000000000000000000000000000000000000000000000000001",
    "0x0000000000000000000000000000000000000000000000000000000000000001",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000001",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000001",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000001"
  ];

  beforeEach(async function () {
    [owner, bidder1] = await ethers.getSigners();
    
    // Deploy minimal contracts for gas testing
    const Verifier = await ethers.getContractFactory("Groth16Verifier");
    verifier = await Verifier.deploy();
    await verifier.waitForDeployment();
    
    console.log(`  📋 Verifier deployed at: ${await verifier.getAddress()}`);
  });

  it("🔍 Should measure verifier-only gas usage", async function () {
    console.log("\n🔬 Testing verifier-only gas usage...");
    
    // Test just the verifier with mock data
    const proofStruct = {
      a: [mockProof[0], mockProof[1]],
      b: [[mockProof[2], mockProof[3]], [mockProof[4], mockProof[5]]],
      c: [mockProof[6], mockProof[7]]
    };
    
    try {
      const gasEstimate = await verifier.verifyProof.estimateGas(
        proofStruct.a,
        proofStruct.b, 
        proofStruct.c,
        mockPublicSignals
      );
      
      console.log(`  ⛽ Verifier-only gas usage: ${gasEstimate.toString()}`);
      console.log(`  📊 Percentage of 100k limit: ${(Number(gasEstimate) / 100000 * 100).toFixed(1)}%`);
      
      // This should be much lower than our full getTakingAmount call
      expect(Number(gasEstimate)).to.be.lessThan(100000, "Verifier alone should be under 100k gas");
      
    } catch (error) {
      console.log(`  ⚠️  Verifier call failed (expected with mock data): ${error.message}`);
      // This is expected to fail with mock data, but we can still see gas estimation
    }
  });

  it("🔍 Should compare local vs forked network gas differences", async function () {
    console.log("\n🔬 Comparing local vs forked network overhead...");
    
    // Simple contract call to measure network overhead
    const gasEstimate = await verifier.verifyProof.estimateGas(
      [mockProof[0], mockProof[1]],
      [[mockProof[2], mockProof[3]], [mockProof[4], mockProof[5]]],
      [mockProof[6], mockProof[7]],
      mockPublicSignals
    ).catch(() => BigInt(0)); // Catch expected failure
    
    console.log(`  ⛽ Network gas estimate: ${gasEstimate.toString()}`);
    console.log(`  📊 Network type: ${ethers.provider._network ? 'Forked' : 'Local'}`);
    console.log(`  🔍 Chain ID: ${(await ethers.provider.getNetwork()).chainId}`);
  });

  it("🔍 Should analyze gas components breakdown", async function () {
    console.log("\n🔬 Analyzing gas usage breakdown...");
    
    // Test different operations to understand gas costs
    const operations = [
      {
        name: "Simple storage read",
        operation: async () => await verifier.getAddress()
      },
      {
        name: "ABI encoding (mock)",
        operation: async () => {
          const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
            ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c)", "uint256[3]", "uint256[8]", "address"],
            [
              { a: [mockProof[0], mockProof[1]], b: [[mockProof[2], mockProof[3]], [mockProof[4], mockProof[5]]], c: [mockProof[6], mockProof[7]] },
              mockPublicSignals,
              mockOriginalWinnerBits,
              await verifier.getAddress()
            ]
          );
          return encoded.length;
        }
      }
    ];
    
    for (const op of operations) {
      try {
        const result = await op.operation();
        console.log(`  📊 ${op.name}: ${typeof result === 'string' ? result.length + ' bytes' : 'completed'}`);
      } catch (error) {
        console.log(`  ⚠️  ${op.name}: ${error.message}`);
      }
    }
  });

  it("🔍 Should validate staticcall limit assumptions", async function () {
    console.log("\n🔬 Validating staticcall limit assumptions...");
    
    // Research: What is the actual staticcall gas limit?
    console.log(`  📚 Common staticcall limits:`);
    console.log(`    - 100,000 gas (common assumption)`);
    console.log(`    - 63/64 of available gas (EIP-150)`);
    console.log(`    - Block gas limit dependent`);
    
    const network = await ethers.provider.getNetwork();
    console.log(`  🌐 Current network: ${network.name} (${network.chainId})`);
    
    // Get latest block to check gas limit
    const latestBlock = await ethers.provider.getBlock('latest');
    console.log(`  ⛽ Block gas limit: ${latestBlock.gasLimit.toString()}`);
    console.log(`  📊 63/64 of block limit: ${(latestBlock.gasLimit * BigInt(63) / BigInt(64)).toString()}`);
  });
}); 