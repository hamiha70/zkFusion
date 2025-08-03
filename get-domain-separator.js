const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔍 Reading EIP-712 Domain from 1inch AggregationRouterV6...");
  console.log("=" .repeat(70));

  const ROUTER_V6_ADDRESS = process.env.ONEINCH_LOP_ADDRESS || "0x111111125421ca6dc452d289314280a0f8842a65";
  
  // Minimal ABI to get the eip712Domain
  const abi = [
    "function eip712Domain() external view returns (bytes1 fields, string memory name, string memory version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] memory extensions)"
  ];

  console.log(`📡 Connecting to Arbitrum fork...`);
  console.log(`🎯 Target Contract (AggregationRouterV6): ${ROUTER_V6_ADDRESS}`);

  try {
    const router = await ethers.getContractAt(abi, ROUTER_V6_ADDRESS);
    
    console.log("\n📞 Calling eip712Domain()...");
    const domain = await router.eip712Domain();
    
    console.log("\n✅ EIP-712 Domain Information Received:");
    console.log("-----------------------------------------");
    console.log(`  - fields:            ${domain[0]}`);
    console.log(`  - name:              "${domain[1]}"`);
    console.log(`  - version:           "${domain[2]}"`);
    console.log(`  - chainId:           ${domain[3].toString()}`);
    console.log(`  - verifyingContract: ${domain[4]}`);
    console.log(`  - salt:              ${domain[5]}`);
    console.log(`  - extensions:        [${domain[6].join(", ")}]`);
    console.log("-----------------------------------------");

    console.log("\n🎯 Actionable Items:");
    console.log(`  1. Update 'name' in signing utility to: "${domain[1]}"`);
    console.log(`  2. Update 'version' in signing utility to: "${domain[2]}"`);
    console.log("  3. Ensure chainId and verifyingContract address match during signing.");

  } catch (error) {
    console.error("\n❌ Error fetching EIP-712 domain:", error.message);
    if(error.message.includes("call revert exception")) {
        console.error("   ⚠️  This might mean the contract does not have the eip712Domain() function, or we are on the wrong network/fork block where the contract doesn't exist.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 