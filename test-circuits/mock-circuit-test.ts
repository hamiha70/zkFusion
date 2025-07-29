/**
 * Mock Circuit Test
 * 
 * Tests the circuit with mock Poseidon hashes to verify
 * that the hash compatibility issue is resolved.
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { generateMockCommitment, generateMockNullCommitment } from '../circuits/utils/mock-poseidon.js';

describe('Mock Poseidon Circuit Test', function() {
  it('should generate witness with mock hashes', async function() {
    console.log('🧪 Testing circuit with mock Poseidon hashes...');
    
    // Create test bid data
    const testBid = {
      price: 1000000000000000000n,
      amount: 2000000000000000000n,
      bidderAddress: '0x1000000000000000000000000000000000000000'
    };
    const contractAddress = '0x2000000000000000000000000000000000000000';
    
    // Generate mock commitments
    const realCommitment = generateMockCommitment(testBid, contractAddress);
    const nullCommitment = generateMockNullCommitment(contractAddress);
    
    console.log(`Real commitment: ${realCommitment.toString()}`);
    console.log(`Null commitment: ${nullCommitment.toString()}`);
    
    // Create circuit inputs with mock hashes
    const mockInputs = {
      bidPrices: [testBid.price.toString(), '0', '0', '0', '0', '0', '0', '0'],
      bidAmounts: [testBid.amount.toString(), '0', '0', '0', '0', '0', '0', '0'],
      bidderAddresses: [BigInt(testBid.bidderAddress).toString(), '0', '0', '0', '0', '0', '0', '0'],
      sortedPrices: [testBid.price.toString(), '0', '0', '0', '0', '0', '0', '0'],
      sortedAmounts: [testBid.amount.toString(), '0', '0', '0', '0', '0', '0', '0'],
      sortedIndices: ['0', '1', '2', '3', '4', '5', '6', '7'],
      winnerBits: ['1', '0', '0', '0', '0', '0', '0', '0'],
      commitments: [realCommitment.toString(), nullCommitment.toString(), nullCommitment.toString(), nullCommitment.toString(), nullCommitment.toString(), nullCommitment.toString(), nullCommitment.toString(), nullCommitment.toString()],
      commitmentContractAddress: BigInt(contractAddress).toString(),
      makerMinimumPrice: '500000000000000000',
      makerMaximumAmount: '2000000000000000000'
    };
    
    console.log('📊 Mock inputs created:');
    console.log(`  Real commitment: ${realCommitment.toString()}`);
    console.log(`  Bid price: ${testBid.price}`);
    console.log(`  Bid amount: ${testBid.amount}`);
    console.log(`  Contract address: ${contractAddress}`);
    
    // Check if compiled circuit files exist
    const wasmPath = path.join(process.cwd(), 'circuits/zkDutchAuction8_js/zkDutchAuction8.wasm');
    const witnessCalculatorPath = path.join(process.cwd(), 'circuits/zkDutchAuction8_js/witness_calculator.js');
    
    if (!fs.existsSync(wasmPath)) {
      throw new Error(`Compiled WASM file not found: ${wasmPath}`);
    }
    
    console.log('✅ Compiled circuit files found');
    
    // Try to use the witness calculator directly
    try {
      // Import the witness calculator builder
      const builder = await import(witnessCalculatorPath);
      
      // Load the WASM file
      const wasmBuffer = fs.readFileSync(wasmPath);
      
      // Create witness calculator
      const witnessCalculator = await builder.default(wasmBuffer);
      
      console.log('✅ Witness calculator created successfully');
      
      // Calculate witness with mock inputs
      console.log('🔄 Calculating witness with mock Poseidon hashes...');
      const witness = await witnessCalculator.calculateWitness(mockInputs);
      
      console.log('✅ Witness generation successful!');
      console.log(`📊 Witness length: ${witness.length}`);
      
      // Basic validation
      expect(witness.length).to.be.greaterThan(0);
      expect(witness[0]).to.equal(1n); // First element should be 1
      
      console.log('🎉 Circuit test completed successfully with mock Poseidon!');
      console.log('✅ This confirms the mock hash implementation resolves the compatibility issue');
      
    } catch (error: any) {
      console.error('❌ Witness generation failed even with mock hashes:');
      console.error(error);
      
      // Try to extract more detailed error information
      if (error.message) {
        console.error('📋 Error details:');
        console.error(`  Message: ${error.message}`);
        
        // Look for specific constraint information
        if (error.message.includes('Assert Failed')) {
          console.error('💡 Constraint violation still detected');
          console.error('💡 This suggests the issue is not just hash compatibility');
        }
      }
      
      throw error;
    }
  });
}); 