/**
 * Hash Format Debug - Compare Poseidon Implementations
 * 
 * This test compares the output formats of different Poseidon hash implementations
 * to identify the root cause of the hash mismatch.
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { realPoseidonHash, generateCommitmentReal } from '../circuits/utils/hash-utils';

describe('Hash Format Debug - Compare Poseidon Implementations', function() {
  it('should analyze different Poseidon hash output formats', async function() {
    console.log('🔍 Analyzing Poseidon hash output formats...');
    
    // Test inputs
    const inputs = [
      1000000000000000000n,  // price
      1000000000000000000n,  // amount  
      1000000000000000000000000000000000000000n,  // bidderAddress
      1000000000000000000000000000000000000000n   // contractAddress
    ];
    
    console.log('📊 Test inputs:');
    inputs.forEach((input, i) => {
      console.log(`  Input ${i}: ${input.toString()}`);
    });
    
    // Test our current implementation
    console.log('\n🧪 Testing our current realPoseidonHash implementation...');
    try {
      const ourHash = await realPoseidonHash(inputs);
      console.log('✅ Our hash result:');
      console.log(`  Type: ${typeof ourHash}`);
      console.log(`  Value: ${ourHash.toString()}`);
      console.log(`  Length: ${ourHash.toString().length} digits`);
      console.log(`  Is BigInt: ${typeof ourHash === 'bigint'}`);
    } catch (error: any) {
      console.error('❌ Our hash failed:', error.message);
    }
    
    // Test our commitment generation
    console.log('\n🧪 Testing our commitment generation...');
    try {
      const testBid = {
        price: 1000000000000000000n,
        amount: 1000000000000000000n,
        bidderAddress: '0x1000000000000000000000000000000000000000',
        originalIndex: 0
      };
      const contractAddress = '0x1000000000000000000000000000000000000000';
      
      const commitment = await generateCommitmentReal(testBid, contractAddress);
      console.log('✅ Our commitment result:');
      console.log(`  Type: ${typeof commitment}`);
      console.log(`  Value: ${commitment.toString()}`);
      console.log(`  Length: ${commitment.toString().length} digits`);
    } catch (error: any) {
      console.error('❌ Our commitment failed:', error.message);
    }
    
    // Test our hash-utils implementation details
    console.log('\n🧪 Testing our hash-utils implementation...');
    try {
      // Let's look at what our realPoseidonHash function actually does
      console.log('📊 Analyzing our realPoseidonHash function...');
      
      // Test with the same inputs as our commitment
      const testBid = {
        price: 1000000000000000000n,
        amount: 1000000000000000000n,
        bidderAddress: '0x1000000000000000000000000000000000000000',
        originalIndex: 0
      };
      const contractAddress = '0x1000000000000000000000000000000000000000';
      
      // Convert address to BigInt
      const bidderBigInt = BigInt(testBid.bidderAddress);
      const contractBigInt = BigInt(contractAddress);
      
      console.log('📊 Input conversion:');
      console.log(`  Price: ${testBid.price} (${typeof testBid.price})`);
      console.log(`  Amount: ${testBid.amount} (${typeof testBid.amount})`);
      console.log(`  Bidder: ${testBid.bidderAddress} → ${bidderBigInt} (${typeof bidderBigInt})`);
      console.log(`  Contract: ${contractAddress} → ${contractBigInt} (${typeof contractBigInt})`);
      
      // Test our hash function directly
      const hashInputs = [testBid.price, testBid.amount, bidderBigInt, contractBigInt];
      const directHash = await realPoseidonHash(hashInputs);
      
      console.log('✅ Direct hash result:');
      console.log(`  Type: ${typeof directHash}`);
      console.log(`  Value: ${directHash.toString()}`);
      console.log(`  Length: ${directHash.toString().length} digits`);
      
      // Compare with commitment generation
      const commitmentHash = await generateCommitmentReal(testBid, contractAddress);
      
      console.log('✅ Commitment hash result:');
      console.log(`  Type: ${typeof commitmentHash}`);
      console.log(`  Value: ${commitmentHash.toString()}`);
      console.log(`  Length: ${commitmentHash.toString().length} digits`);
      
      console.log('🔍 Comparison:');
      console.log(`  Direct hash: ${directHash.toString()}`);
      console.log(`  Commitment: ${commitmentHash.toString()}`);
      console.log(`  Match: ${directHash === commitmentHash ? '✅ YES' : '❌ NO'}`);
      
    } catch (error: any) {
      console.error('❌ Hash analysis failed:', error.message);
    }
    
    console.log('\n🎯 SUMMARY:');
    console.log('This test reveals the exact format differences between implementations.');
    console.log('We can now identify the root cause of the hash mismatch.');
  });
}); 