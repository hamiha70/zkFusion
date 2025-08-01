/**
 * Field Bounds Test - Check if values are within BN254 field bounds
 * 
 * This test uses properly bounded field elements to see if that fixes the issue.
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { realPoseidonHash } from '../circuits/utils/hash-utils';

describe('Field Bounds Test - Check if values are within BN254 field bounds', function() {
  it('should test with properly bounded field elements', async function() {
    console.log('🧪 Testing with properly bounded field elements...');
    
    // BN254 prime field
    const PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    
    // Use smaller values that are definitely within field bounds
    const bidPrice = 1000n;
    const bidAmount = 1000n;
    const bidderAddress = 1000n;  // Small address
    const contractAddress = 1000n; // Small address
    
    console.log('📊 Field-bounded inputs:');
    console.log(`  Price: ${bidPrice} (${bidPrice < PRIME ? '✅ Within bounds' : '❌ Too large'})`);
    console.log(`  Amount: ${bidAmount} (${bidAmount < PRIME ? '✅ Within bounds' : '❌ Too large'})`);
    console.log(`  Bidder: ${bidderAddress} (${bidderAddress < PRIME ? '✅ Within bounds' : '❌ Too large'})`);
    console.log(`  Contract: ${contractAddress} (${contractAddress < PRIME ? '✅ Within bounds' : '❌ Too large'})`);
    
    // Calculate the REAL Poseidon hash with bounded values
    console.log('🔄 Calculating real Poseidon hash with bounded values...');
    const realCommitment = await realPoseidonHash([
      bidPrice,
      bidAmount, 
      bidderAddress,
      contractAddress
    ]);
    
    console.log('📊 Real commitment hash:', realCommitment.toString());
    console.log(`  Hash within bounds: ${realCommitment < PRIME ? '✅ YES' : '❌ NO'}`);
    
    // Create inputs with the REAL hash and bounded values
    const boundedInputs = {
      bidPrices: [bidPrice.toString(), '0', '0', '0', '0', '0', '0', '0'],
      bidAmounts: [bidAmount.toString(), '0', '0', '0', '0', '0', '0', '0'],
      bidderAddresses: [bidderAddress.toString(), '0', '0', '0', '0', '0', '0', '0'],
      sortedPrices: [bidPrice.toString(), '0', '0', '0', '0', '0', '0', '0'],
      sortedAmounts: [bidAmount.toString(), '0', '0', '0', '0', '0', '0', '0'],
      sortedIndices: ['0', '1', '2', '3', '4', '5', '6', '7'],
      winnerBits: ['1', '0', '0', '0', '0', '0', '0', '0'],
      commitments: [realCommitment.toString(), '0', '0', '0', '0', '0', '0', '0'],
      commitmentContractAddress: contractAddress.toString(),
      makerMinimumPrice: '500',  // Small value
      makerMaximumAmount: '2000'  // Small value
    };
    
    console.log('📊 Bounded inputs:');
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
      
      // Calculate witness with bounded inputs
      console.log('🔄 Calculating witness with bounded field elements...');
      const witness = await witnessCalculator.calculateWitness(boundedInputs);
      
      console.log('✅ Witness generation successful!');
      console.log(`📊 Witness length: ${witness.length}`);
      
      // Basic validation
      expect(witness.length).to.be.greaterThan(0);
      expect(witness[0]).to.equal(1n); // First element should be 1
      
      console.log('🎉 Circuit test completed successfully with bounded field elements!');
      console.log('✅ This confirms the issue was field element bounds');
      
    } catch (error: any) {
      console.error('❌ Witness generation failed even with bounded values:');
      console.error(error);
      
      // Try to extract more detailed error information
      if (error.message) {
        console.error('📋 Error details:');
        console.error(`  Message: ${error.message}`);
        
        // Look for specific constraint information
        if (error.message.includes('Assert Failed')) {
          console.error('💡 Constraint violation detected even with bounded values');
          console.error('💡 The issue is NOT field element bounds');
        }
      }
      
      throw error;
    }
  });
}); 