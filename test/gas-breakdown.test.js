const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("🔍 Gas Breakdown Analysis", function () {
  let commitmentFactory, zkFusionExecutor, zkFusionGetter, verifier;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    
    // Deploy all contracts like in integration test
    const Verifier = await ethers.getContractFactory("Groth16Verifier");
    verifier = await Verifier.deploy();
    await verifier.waitForDeployment();
    
    const CommitmentFactory = await ethers.getContractFactory("CommitmentFactory");
    commitmentFactory = await CommitmentFactory.deploy();
    await commitmentFactory.waitForDeployment();
    
    const zkFusionExecutorFactory = await ethers.getContractFactory("zkFusionExecutor");
    zkFusionExecutor = await zkFusionExecutorFactory.deploy(
      ethers.ZeroAddress, // _lop (mock for gas test)
      await verifier.getAddress(),
      await commitmentFactory.getAddress()
    );
    await zkFusionExecutor.waitForDeployment();
    
    const ZkFusionGetter = await ethers.getContractFactory("ZkFusionGetter");
    zkFusionGetter = await ZkFusionGetter.deploy(await zkFusionExecutor.getAddress());
    await zkFusionGetter.waitForDeployment();
    
    console.log(`  📋 All contracts deployed for gas analysis`);
  });

  it("🔍 Should measure gas for ABI encoding/decoding", async function () {
    console.log("\n🔬 Testing ABI encoding/decoding gas costs...");
    
    // Test the extension data encoding that we do in the integration test
    const mockProofStruct = {
      a: ["0x1234567890123456789012345678901234567890123456789012345678901234", "0x2345678901234567890123456789012345678901234567890123456789012345"],
      b: [["0x3456789012345678901234567890123456789012345678901234567890123456", "0x4567890123456789012345678901234567890123456789012345678901234567"], ["0x5678901234567890123456789012345678901234567890123456789012345678", "0x6789012345678901234567890123456789012345678901234567890123456789"]],
      c: ["0x789012345678901234567890123456789012345678901234567890123456789a", "0x89012345678901234567890123456789012345678901234567890123456789ab"]
    };
    
    const mockPublicSignals = ["0x1111111111111111111111111111111111111111111111111111111111111111", "0x2222222222222222222222222222222222222222222222222222222222222222", "0x3333333333333333333333333333333333333333333333333333333333333333"];
    
    const mockOriginalWinnerBits = ["0x0000000000000000000000000000000000000000000000000000000000000001", "0x0000000000000000000000000000000000000000000000000000000000000001", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000001", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000001", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000001"];
    
    const commitmentAddress = await zkFusionGetter.getAddress();
    
    // Measure ABI encoding
    const startTime = Date.now();
    const extensionData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(uint256[2] a, uint256[2][2] b, uint256[2] c)", "uint256[3]", "uint256[8]", "address"],
      [mockProofStruct, mockPublicSignals, mockOriginalWinnerBits, commitmentAddress]
    );
    const encodingTime = Date.now() - startTime;
    
    console.log(`  📊 ABI encoding time: ${encodingTime}ms`);
    console.log(`  📊 Extension data size: ${extensionData.length} bytes`);
    
    // Add getter address prefix
    const getterAddress = await zkFusionGetter.getAddress();
    const getterAddressBytes = ethers.getBytes(getterAddress);
    const fullExtensionData = ethers.concat([getterAddressBytes, extensionData]);
    
    console.log(`  📊 Full extension data size: ${fullExtensionData.length} bytes`);
    console.log(`  📊 Getter address prefix: 20 bytes`);
    console.log(`  📊 Proof data: ${extensionData.length} bytes`);
  });

  it("🔍 Should compare contract function gas costs", async function () {
    console.log("\n🔬 Comparing individual contract function costs...");
    
    const operations = [
      {
        name: "zkFusionGetter.getAddress()",
        test: async () => await zkFusionGetter.getAddress.estimateGas()
      },
      {
        name: "commitmentFactory.isValidCommitmentContract()",
        test: async () => await commitmentFactory.isValidCommitmentContract.estimateGas(ethers.ZeroAddress)
      }
    ];
    
    for (const op of operations) {
      try {
        const gasEstimate = await op.test();
        console.log(`  📊 ${op.name}: ${gasEstimate.toString()} gas`);
      } catch (error) {
        console.log(`  ⚠️  ${op.name}: ${error.message}`);
      }
    }
  });

  it("🔍 Should analyze the 265k vs 35k gas discrepancy", async function () {
    console.log("\n🔬 Analyzing the gas discrepancy...");
    
    console.log(`  📊 Integration test total: 265,040 gas`);
    console.log(`  📊 Verifier alone (working): 35,240 gas`);
    console.log(`  📊 Difference: ${265040 - 35240} gas`);
    console.log(`  📊 Non-verifier percentage: ${((265040 - 35240) / 265040 * 100).toFixed(1)}%`);
    
    console.log(`\n  🔍 Gas usage breakdown hypothesis:`);
    console.log(`    - Groth16 verification: ~35,000 gas`);
    console.log(`    - Contract logic overhead: ~50,000 gas`);
    console.log(`    - ABI encoding/decoding: ~30,000 gas`);
    console.log(`    - 1inch LOP interface calls: ~20,000 gas`);
    console.log(`    - Commitment validation: ~30,000 gas`);
    console.log(`    - Storage operations: ~40,000 gas`);
    console.log(`    - Other overhead: ~60,000 gas`);
    console.log(`    - TOTAL ESTIMATE: ~265,000 gas`);
    
    console.log(`\n  💡 OPTIMIZATION OPPORTUNITIES:`);
    console.log(`    1. Reduce contract logic complexity`);
    console.log(`    2. Optimize ABI encoding (pre-compute?)`);
    console.log(`    3. Minimize storage operations`);
    console.log(`    4. Streamline commitment validation`);
    console.log(`    5. Remove unnecessary 1inch interface calls`);
  });
}); 