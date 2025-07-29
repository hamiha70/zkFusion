/**
 * Mock Poseidon Hash Implementation
 * 
 * CRITICAL WARNING: This is NOT cryptographically secure!
 * Only use for hackathon demo and testing.
 * Must be replaced with proper Poseidon before production.
 * 
 * This implementation provides consistent results between JavaScript and circuit
 * for immediate unblocking of the zkFusion system.
 */

import { FieldElement, BN254_PRIME, MockHashFunction } from './types';

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
export const mockPoseidonConsistent: MockHashFunction = (inputs: FieldElement[]): FieldElement => {
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
};

/**
 * Generate mock commitment for a bid
 * 
 * @param bid Bid object with price, amount, bidder address
 * @param contractAddress Commitment contract address
 * @returns Mock commitment hash
 */
export function generateMockCommitment(bid: { price: bigint; amount: bigint; bidderAddress: string }, contractAddress: string): FieldElement {
  // Convert addresses to field elements (simple conversion)
  const bidderBigInt = BigInt(bid.bidderAddress);
  const contractBigInt = BigInt(contractAddress);
  
  // Create inputs array: [price, amount, bidderAddress, contractAddress]
  const inputs: FieldElement[] = [
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
export function generateMockNullCommitment(contractAddress: string): FieldElement {
  // Null bid: [0, 0, 0, contractAddress]
  const inputs: FieldElement[] = [
    0n,
    0n,
    0n,
    BigInt(contractAddress)
  ];
  
  return mockPoseidonConsistent(inputs);
}

/**
 * Validate that a value is a proper field element
 * 
 * @param value Value to validate
 * @returns True if valid field element
 */
export function validateFieldElement(value: FieldElement): boolean {
  return typeof value === 'bigint' && value >= 0n && value < BN254_PRIME;
}

/**
 * Convert address string to field element
 * 
 * @param address Ethereum address string
 * @returns Field element representation
 */
export function addressToFieldElement(address: string): FieldElement {
  return BigInt(address);
}

/**
 * Format any value as field element string
 * 
 * @param value Value to format
 * @returns String representation for circuit input
 */
export function formatFieldElement(value: bigint | string | number): string {
  const bigIntValue = BigInt(value);
  
  // Ensure it's within field bounds
  const boundedValue = bigIntValue % BN254_PRIME;
  if (boundedValue < 0n) {
    throw new Error(`Negative value cannot be field element: ${value}`);
  }
  
  return boundedValue.toString();
}

/**
 * Test the mock implementation
 */
export function testMockPoseidon(): void {
  console.log('🧪 Testing mock Poseidon implementation...');
  
  // Test case 1: Simple values
  const inputs1: FieldElement[] = [1000n, 1000n, 1000n, 1000n];
  const hash1 = mockPoseidonConsistent(inputs1);
  console.log(`Test 1 hash: ${hash1.toString()}`);
  
  // Test case 2: Zero values
  const inputs2: FieldElement[] = [0n, 0n, 0n, 1000n];
  const hash2 = mockPoseidonConsistent(inputs2);
  console.log(`Test 2 hash: ${hash2.toString()}`);
  
  // Test case 3: Large values
  const inputs3: FieldElement[] = [
    1000000000000000000n,
    2000000000000000000n,
    3000000000000000000n,
    4000000000000000000n
  ];
  const hash3 = mockPoseidonConsistent(inputs3);
  console.log(`Test 3 hash: ${hash3.toString()}`);
  
  // Verify all hashes are within field bounds
  console.log(`Hash 1 valid: ${validateFieldElement(hash1)}`);
  console.log(`Hash 2 valid: ${validateFieldElement(hash2)}`);
  console.log(`Hash 3 valid: ${validateFieldElement(hash3)}`);
  
  console.log('✅ Mock Poseidon tests completed');
}

/**
 * Mock Poseidon configuration for circuit compatibility
 */
export const MOCK_POSEIDON_CONFIG = {
  nInputs: 4,
  nRoundsF: 8,
  nRoundsP: 56,
  seed: 'poseidon-mock',
  prime: BN254_PRIME,
} as const; 