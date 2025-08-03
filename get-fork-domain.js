const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔍 Getting EIP-712 Domain from FORKED Network Contract");
  console.log("=" .repeat(70));

  const ROUTER_ADDRESS = ethers.getAddress("0x111111125421ca6dc452d289314280a0f8842a65");
  
  console.log(`🎯 Target: ${ROUTER_ADDRESS}`);
  
  // Get network info first
  const network = await ethers.provider.getNetwork();
  console.log(`📊 Network: ${network.name} (chainId: ${network.chainId})`);
  console.log("");

  try {
    // Try to call eip712Domain on the forked contract
    const abi = [
      "function eip712Domain() external view returns (bytes1 fields, string memory name, string memory version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] memory extensions)"
    ];

    const router = await ethers.getContractAt(abi, ROUTER_ADDRESS);
    
    console.log("📞 Calling eip712Domain() on forked contract...");
    const domain = await router.eip712Domain();
    
    console.log("\n✅ FORKED CONTRACT EIP-712 Domain:");
    console.log("-".repeat(50));
    console.log(`  fields:            ${domain[0]}`);
    console.log(`  name:              "${domain[1]}"`);
    console.log(`  version:           "${domain[2]}"`);
    console.log(`  chainId:           ${domain[3].toString()}`);
    console.log(`  verifyingContract: ${domain[4]}`);
    console.log(`  salt:              ${domain[5]}`);
    console.log(`  extensions:        [${domain[6].join(", ")}]`);
    console.log("-".repeat(50));

    console.log("\n🔍 ANALYSIS:");
    console.log(`  Contract says chainId: ${domain[3].toString()}`);
    console.log(`  Network actual chainId: ${network.chainId.toString()}`);
    console.log(`  Match: ${domain[3].toString() === network.chainId.toString() ? "✅ YES" : "❌ NO"}`);
    
    if (domain[3].toString() !== network.chainId.toString()) {
      console.log("\n🚨 CRITICAL FINDING:");
      console.log(`  The contract's EIP-712 domain has chainId ${domain[3]}`);
      console.log(`  But our network is using chainId ${network.chainId}`);
      console.log(`  This could be the source of the signature mismatch!`);
      
      console.log("\n🔧 POTENTIAL SOLUTIONS:");
      console.log(`  1. Use chainId ${domain[3]} in our signature (contract's preference)`);
      console.log(`  2. Or investigate why there's a mismatch`);
    }

  } catch (error) {
    console.error("\n❌ Error calling eip712Domain:", error.message);
    
    // Let's also try to see if the contract exists at all
    const code = await ethers.provider.getCode(ROUTER_ADDRESS);
    console.log(`\n📊 Contract code length: ${code.length} characters`);
    console.log(`Contract exists: ${code !== "0x" ? "✅ YES" : "❌ NO"}`);
    
    if (code === "0x") {
      console.log("\n🚨 MAJOR ISSUE: Contract doesn't exist on this network!");
      console.log("This could mean:");
      console.log("1. Wrong contract address");
      console.log("2. Wrong network/fork configuration");
      console.log("3. Fork block is before contract deployment");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 