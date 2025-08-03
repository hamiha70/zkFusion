const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔍 CHECKING DOMAIN_SEPARATOR() FUNCTION");
  console.log("💡 Based on Discord insight: 'look at the domain separator and make sure its aligned w the contract'");
  console.log("=" .repeat(70));

  const ROUTER_ADDRESS = ethers.getAddress("0x111111125421ca6dc452d289314280a0f8842a65");
  
  console.log(`🎯 Target Contract: ${ROUTER_ADDRESS}`);
  console.log("");

  try {
    // Try to call DOMAIN_SEPARATOR() function
    const domainSeparatorABI = [
      "function DOMAIN_SEPARATOR() external view returns (bytes32)"
    ];
    
    const contract = await ethers.getContractAt(domainSeparatorABI, ROUTER_ADDRESS);
    
    console.log("📞 Calling DOMAIN_SEPARATOR()...");
    
    try {
      const domainSeparator = await contract.DOMAIN_SEPARATOR();
      console.log(`✅ DOMAIN_SEPARATOR found: ${domainSeparator}`);
      
      // Now let's generate our own domain separator and compare
      console.log("\n🔍 COMPARING WITH OUR EIP-712 DOMAIN GENERATION:");
      console.log("-".repeat(50));
      
      // Test different domain combinations
      const testDomains = [
        {
          name: "1inch Limit Order Protocol",
          version: "4",
          chainId: 42161,
          verifyingContract: ROUTER_ADDRESS
        },
        {
          name: "1inch Aggregation Router", 
          version: "6",
          chainId: 42161,
          verifyingContract: ROUTER_ADDRESS
        },
        {
          name: "1inch Limit Order Protocol",
          version: "4", 
          chainId: 31337, // Network chainId
          verifyingContract: ROUTER_ADDRESS
        }
      ];
      
      for (let i = 0; i < testDomains.length; i++) {
        const domain = testDomains[i];
        console.log(`\n🧪 Test ${i + 1}: ${domain.name} v${domain.version} (chainId: ${domain.chainId})`);
        
        // Generate domain separator manually
        const domainTypeHash = ethers.keccak256(
          ethers.toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
        );
        
        const nameHash = ethers.keccak256(ethers.toUtf8Bytes(domain.name));
        const versionHash = ethers.keccak256(ethers.toUtf8Bytes(domain.version));
        
        const encodedDomain = ethers.AbiCoder.defaultAbiCoder().encode(
          ["bytes32", "bytes32", "bytes32", "uint256", "address"],
          [domainTypeHash, nameHash, versionHash, domain.chainId, domain.verifyingContract]
        );
        
        const calculatedDomainSeparator = ethers.keccak256(encodedDomain);
        
        console.log(`   Calculated: ${calculatedDomainSeparator}`);
        console.log(`   Contract:   ${domainSeparator}`);
        console.log(`   Match: ${calculatedDomainSeparator === domainSeparator ? "✅ YES! FOUND IT!" : "❌ No"}`);
        
        if (calculatedDomainSeparator === domainSeparator) {
          console.log(`\n🎉 BREAKTHROUGH! Found matching domain:`);
          console.log(`   Name: "${domain.name}"`);
          console.log(`   Version: "${domain.version}"`);
          console.log(`   ChainId: ${domain.chainId}`);
          console.log(`   VerifyingContract: ${domain.verifyingContract}`);
          break;
        }
      }
      
    } catch (domainError) {
      console.log(`❌ DOMAIN_SEPARATOR() call failed: ${domainError.message}`);
      console.log("   This contract might not have a DOMAIN_SEPARATOR() function");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 