/**
 * Mock Poseidon Test
 * 
 * Tests the mock Poseidon implementation to ensure it produces
 * consistent, deterministic results suitable for circuit testing.
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { 
  mockPoseidonConsistent, 
  generateMockCommitment, 
  generateMockNullCommitment,
  testMockPoseidon 
} from '../circuits/utils/mock-poseidon';

describe('Mock Poseidon Implementation', function() {
  it('should produce consistent hash results', function() {
    console.log('🧪 Testing mock Poseidon consistency...');
    
    // Test 1: Simple inputs
    const inputs1 = [1000n, 1000n, 1000n, 1000n];
    const hash1a = mockPoseidonConsistent(inputs1);
    const hash1b = mockPoseidonConsistent(inputs1);
    
    console.log(`Hash 1a: ${hash1a.toString()}`);
    console.log(`Hash 1b: ${hash1b.toString()}`);
    console.log(`Consistent: ${hash1a === hash1b ? '✅ YES' : '❌ NO'}`);
    
    expect(hash1a).to.equal(hash1b);
    
    // Test 2: Different inputs
    const inputs2 = [2000n, 2000n, 2000n, 2000n];
    const hash2 = mockPoseidonConsistent(inputs2);
    
    console.log(`Hash 2: ${hash2.toString()}`);
    console.log(`Different from Hash 1: ${hash2 !== hash1a ? '✅ YES' : '❌ NO'}`);
    
    expect(hash2).to.not.equal(hash1a);
    
    // Test 3: Zero inputs (null commitment)
    const inputs3 = [0n, 0n, 0n, 1000n];
    const hash3 = mockPoseidonConsistent(inputs3);
    
    console.log(`Null commitment hash: ${hash3.toString()}`);
    
    // Test 4: Large values
    const inputs4 = [
      1000000000000000000n,
      2000000000000000000n,
      3000000000000000000n,
      4000000000000000000n
    ];
    const hash4 = mockPoseidonConsistent(inputs4);
    
    console.log(`Large values hash: ${hash4.toString()}`);
    
    console.log('✅ All consistency tests passed');
  });
  
  it('should generate mock commitments correctly', function() {
    console.log('🧪 Testing mock commitment generation...');
    
    const testBid = {
      price: 1000000000000000000n,
      amount: 2000000000000000000n,
      bidderAddress: '0x1000000000000000000000000000000000000000'
    };
    const contractAddress = '0x2000000000000000000000000000000000000000';
    
    // Generate commitment
    const commitment = generateMockCommitment(testBid, contractAddress);
    console.log(`Mock commitment: ${commitment.toString()}`);
    
    // Generate null commitment
    const nullCommitment = generateMockNullCommitment(contractAddress);
    console.log(`Null commitment: ${nullCommitment.toString()}`);
    
    // Verify they're different
    expect(commitment).to.not.equal(nullCommitment);
    
    // Verify they're both valid field elements
    expect(commitment).to.be.greaterThan(0n);
    expect(nullCommitment).to.be.greaterThan(0n);
    
    console.log('✅ Mock commitment generation tests passed');
  });
  
  it('should run comprehensive test suite', function() {
    console.log('🧪 Running comprehensive mock Poseidon test suite...');
    
    // Run the built-in test function
    testMockPoseidon();
    
    console.log('✅ Comprehensive test suite completed');
  });
}); 