const { poseidon4 } = require('poseidon-lite');

// Large test data: our original values
const testData = {
  bidPrices: ["2000000000000000000", "1800000000000000000", "0", "0", "0", "0", "0", "0"],
  bidAmounts: ["50000000000000000000", "30000000000000000000", "0", "0", "0", "0", "0", "0"],
  bidderAddresses: ["97433442488726861213578988847752201310395502865", "194866884977453722427157977695504402620791005730", "0", "0", "0", "0", "0", "0"],
  // Sorted by price descending: already sorted
  sortedPrices: ["2000000000000000000", "1800000000000000000", "0", "0", "0", "0", "0", "0"],
  sortedAmounts: ["50000000000000000000", "30000000000000000000", "0", "0", "0", "0", "0", "0"],
  sortedIndices: ["0", "1", "2", "3", "4", "5", "6", "7"],
  commitmentContractAddress: "980829952874933953260395954475453710549606443981"
};

// Generate correct Poseidon hashes
console.log('Generating minimal test data with correct Poseidon hashes...');

const commitments = [];
for (let i = 0; i < 8; i++) {
  const price = BigInt(testData.bidPrices[i]);
  const amount = BigInt(testData.bidAmounts[i]);
  const bidder = BigInt(testData.bidderAddresses[i]);
  const contract = BigInt(testData.commitmentContractAddress);
  
  const hash = poseidon4([price, amount, bidder, contract]);
  commitments.push(hash.toString());
  
  console.log(`Bid ${i}: poseidon([${price}, ${amount}, ${bidder}, ${contract}]) = ${hash}`);
}

const inputData = {
  ...testData,
  commitments
};

console.log('\nGenerated input data:');
console.log(JSON.stringify(inputData, null, 2));

// Write to file
const fs = require('fs');
fs.writeFileSync('test-minimal-values_js/input.json', JSON.stringify(inputData, null, 2));
console.log('\n✅ Written to test-minimal-values_js/input.json'); 