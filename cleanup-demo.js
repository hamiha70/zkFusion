const fs = require('fs');
const path = require('path');

// List of temporary files to clean up
const tempFiles = [
  'check-network-details.js',
  'test-corrected-signature.js', 
  'test-original-domain.js',
  'progressive-debug.js',
  'get-fork-domain.js',
  'check-contract-activity.js',
  'verify-1inch-addresses.js',
  'debug-execution-issue.js',
  'test-contract-chainid.js',
  'check-domain-separator.js'
];

console.log("🧹 zkFusion Demo Cleanup");
console.log("=" .repeat(40));
console.log("");

console.log("🗑️  Removing temporary debugging files...");

let removedCount = 0;
let keptCount = 0;

tempFiles.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`   ✅ Removed: ${file}`);
      removedCount++;
    } else {
      console.log(`   ⚠️  Not found: ${file}`);
      keptCount++;
    }
  } catch (error) {
    console.log(`   ❌ Error removing ${file}: ${error.message}`);
    keptCount++;
  }
});

console.log("");
console.log("📊 Cleanup Summary:");
console.log(`   Files removed: ${removedCount}`);
console.log(`   Files not found: ${keptCount}`);
console.log("");

console.log("📁 Keeping essential files:");
console.log("   ✅ demo-showcase.js (main demo)");
console.log("   ✅ gas-analysis-detailed.js (gas analysis)");
console.log("   ✅ test/ directory (test suite)");
console.log("   ✅ contracts/ directory (smart contracts)");
console.log("   ✅ circuits/ directory (ZK circuits)");
console.log("   ✅ docs_demo/ directory (documentation)");
console.log("");

console.log("🎯 Demo is now clean and ready for presentation!");
console.log("Run: npm run demo");