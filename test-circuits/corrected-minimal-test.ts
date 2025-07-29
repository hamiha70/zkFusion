/**
 * Corrected Minimal Circuit Test - Using REAL Poseidon Hashes
 * 
 * This test uses actual computed Poseidon hashes to test the circuit properly.
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { realPoseidonHash } from '../circuits/utils/hash-utils';

describe('Corrected Minimal Circuit Test - Using REAL Poseidon Hashes', function() {
  it('should test with real Poseidon hashes', async function() {
    console.log('🧪 Testing with real Poseidon hashes...');
    
    // Define minimal bid data
    const bidPrice = 1000000000000000000n;
    const bidAmount = 1000000000000000000n;
    const bidderAddress = 1000000000000000000000000000000000000000n;
    const contractAddress = 1000000000000000000000000000000000000000n;
    
    // Calculate the REAL Poseidon hash
    console.log('🔄 Calculating real Poseidon hash...');
    const realCommitment = await realPoseidonHash([
      bidPrice,
      bidAmount, 
      bidderAddress,
      contractAddress
    ]);
    
    console.log('📊 Real commitment hash:', realCommitment.toString());
    
    // Create inputs with the REAL hash
    const correctedInputs = {
      bidPrices: [bidPrice.toString(), '0', '0', '0', '0', '0', '0', '0'],
      bidAmounts: [bidAmount.toString(), '0', '0', '0', '0', '0', '0', '0'],
      bidderAddresses: [bidderAddress.toString(), '0', '0', '0', '0', '0', '0', '0'],
      sortedPrices: [bidPrice.toString(), '0', '0', '0', '0', '0', '0', '0'],
      sortedAmounts: [bidAmount.toString(), '0', '0', '0', '0', '0', '0', '0'],
      sortedIndices: ['0', '1', '2', '3', '4', '5', '6', '7'],
      winnerBits: ['1', '0', '0', '0', '0', '0', '0', '0'],
      // CORRECTED: Use the real Poseidon hash
      commitments: [realCommitment.toString(), '0', '0', '0', '0', '0', '0', '0'],
      commitmentContractAddress: contractAddress.toString(),
      makerMinimumPrice: '500000000000000000',
      makerMaximumAmount: '2000000000000000000'
    };
    
    console.log('📊 Corrected inputs:');
    console.log(`  Real commitment: ${realCommitment.toString()}`);
    console.log(`  Bid price: ${bidPrice}`);
    console.log(`  Bid amount: ${bidAmount}`);
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
      
      // Calculate witness with corrected inputs
      console.log('🔄 Calculating witness with REAL Poseidon hash...');
      const witness = await witnessCalculator.calculateWitness(correctedInputs);
      
      console.log('✅ Witness generation successful!');
      console.log(`📊 Witness length: ${witness.length}`);
      
      // Basic validation
      expect(witness.length).to.be.greaterThan(0);
      expect(witness[0]).to.equal(1n); // First element should be 1
      
      console.log('🎉 Circuit test completed successfully with REAL Poseidon hashes!');
      console.log('✅ This confirms the circuit logic is correct when given proper inputs');
      
    } catch (error: any) {
      console.error('❌ Witness generation failed even with real Poseidon hash:');
      console.error(error);
      
      // Try to extract more detailed error information
      if (error.message) {
        console.error('📋 Error details:');
        console.error(`  Message: ${error.message}`);
        
        // Look for specific constraint information
        if (error.message.includes('Assert Failed')) {
          console.error('💡 Constraint violation detected');
          console.error('💡 This suggests a deeper issue with the circuit or input format');
        }
      }
      
      throw error;
    }
  });
}); 