/**
 * Simple test for mock Poseidon implementation
 */

// Import the mock implementation
const { mockPoseidonConsistent, generateMockCommitment } = require('./circuits/utils/mock-poseidon.ts');

console.log('🧪 Testing mock Poseidon implementation...');

// Test 1: Simple inputs
const inputs1 = [1000n, 1000n, 1000n, 1000n];
const hash1a = mockPoseidonConsistent(inputs1);
const hash1b = mockPoseidonConsistent(inputs1);

console.log(`Hash 1a: ${hash1a.toString()}`);
console.log(`Hash 1b: ${hash1b.toString()}`);
console.log(`Consistent: ${hash1a === hash1b ? '✅ YES' : '❌ NO'}`);

// Test 2: Different inputs
const inputs2 = [2000n, 2000n, 2000n, 2000n];
const hash2 = mockPoseidonConsistent(inputs2);

console.log(`Hash 2: ${hash2.toString()}`);
console.log(`Different from Hash 1: ${hash2 !== hash1a ? '✅ YES' : '❌ NO'}`);

// Test 3: Mock commitment
const testBid = {
  price: 1000000000000000000n,
  amount: 2000000000000000000n,
  bidderAddress: '0x1000000000000000000000000000000000000000'
};
const contractAddress = '0x2000000000000000000000000000000000000000';

const commitment = generateMockCommitment(testBid, contractAddress);
console.log(`Mock commitment: ${commitment.toString()}`);

console.log('✅ Mock Poseidon tests completed'); 