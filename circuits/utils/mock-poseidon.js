/**
 * Mock Poseidon Hash Implementation (JavaScript)
 * 
 * CRITICAL WARNING: This is NOT cryptographically secure!
 * Only use for hackathon demo and testing.
 * Must be replaced with proper Poseidon before production.
 */

// BN254 prime field constant
const BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Mock Poseidon hash function that produces consistent results
 * 
 * Uses a simple deterministic polynomial hash that both JavaScript and circuit
 * can compute identically. This allows immediate progress while we implement
 * the proper cryptographic solution.
 * 
 * @param inputs Array of field elements to hash
 * @returns Deterministic hash result
 */
function mockPoseidonConsistent(inputs) {
  // Simple polynomial hash with constants that work well in BN254 field
  let hash = 12345678901234567890n; // Starting seed
  
  for (const input of inputs) {
    // Ensure input is within field bounds
    const boundedInput = input % BN254_PRIME;
    if (boundedInput < 0n) {
      throw new Error(`Negative field element: ${input}`);
    }
    
    // Simple polynomial: hash = hash * 31 + input (mod prime)
    hash = ((hash * 31n + boundedInput) % BN254_PRIME + BN254_PRIME) % BN254_PRIME;
  }
  
  return hash;
}

/**
 * Generate mock commitment for a bid
 * 
 * @param bid Bid object with price, amount, bidder address
 * @param contractAddress Commitment contract address
 * @returns Mock commitment hash
 */
function generateMockCommitment(bid, contractAddress) {
  // Convert addresses to field elements (simple conversion)
  const bidderBigInt = BigInt(bid.bidderAddress);
  const contractBigInt = BigInt(contractAddress);
  
  // Create inputs array: [price, amount, bidderAddress, contractAddress]
  const inputs = [
    bid.price,
    bid.amount,
    bidderBigInt,
    contractBigInt
  ];
  
  return mockPoseidonConsistent(inputs);
}

/**
 * Generate mock null commitment for padding
 * 
 * @param contractAddress Commitment contract address
 * @returns Mock null commitment hash
 */
function generateMockNullCommitment(contractAddress) {
  // Null bid: [0, 0, 0, contractAddress]
  const inputs = [
    0n,
    0n,
    0n,
    BigInt(contractAddress)
  ];
  
  return mockPoseidonConsistent(inputs);
}

/**
 * Test the mock implementation
 */
function testMockPoseidon() {
  console.log('🧪 Testing mock Poseidon implementation...');
  
  // Test case 1: Simple values
  const inputs1 = [1000n, 1000n, 1000n, 1000n];
  const hash1 = mockPoseidonConsistent(inputs1);
  console.log(`Test 1 hash: ${hash1.toString()}`);
  
  // Test case 2: Zero values
  const inputs2 = [0n, 0n, 0n, 1000n];
  const hash2 = mockPoseidonConsistent(inputs2);
  console.log(`Test 2 hash: ${hash2.toString()}`);
  
  // Test case 3: Large values
  const inputs3 = [
    1000000000000000000n,
    2000000000000000000n,
    3000000000000000000n,
    4000000000000000000n
  ];
  const hash3 = mockPoseidonConsistent(inputs3);
  console.log(`Test 3 hash: ${hash3.toString()}`);
  
  // Verify all hashes are within field bounds
  console.log(`Hash 1 valid: ${hash1 >= 0n && hash1 < BN254_PRIME}`);
  console.log(`Hash 2 valid: ${hash2 >= 0n && hash2 < BN254_PRIME}`);
  console.log(`Hash 3 valid: ${hash3 >= 0n && hash3 < BN254_PRIME}`);
  
  console.log('✅ Mock Poseidon tests completed');
}

module.exports = {
  mockPoseidonConsistent,
  generateMockCommitment,
  generateMockNullCommitment,
  testMockPoseidon,
  BN254_PRIME
}; 