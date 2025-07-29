/**
 * Tiny Circuit Test - Using Minimal Values
 * 
 * This test uses the smallest possible values to see if the issue persists.
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

describe('Tiny Circuit Test - Using Minimal Values', function() {
  it('should test with tiny values to see if the issue persists', async function() {
    console.log('🧪 Testing with tiny values...');
    
    // Create the tiniest possible inputs
    const tinyInputs = {
      bidPrices: ['100', '0', '0', '0', '0', '0', '0', '0'],
      bidAmounts: ['100', '0', '0', '0', '0', '0', '0', '0'],
      bidderAddresses: ['100', '0', '0', '0', '0', '0', '0', '0'],
      sortedPrices: ['100', '0', '0', '0', '0', '0', '0', '0'],
      sortedAmounts: ['100', '0', '0', '0', '0', '0', '0', '0'],
      sortedIndices: ['0', '1', '2', '3', '4', '5', '6', '7'],
      winnerBits: ['1', '0', '0', '0', '0', '0', '0', '0'],
      commitments: ['100', '0', '0', '0', '0', '0', '0', '0'],
      commitmentContractAddress: '100',
      makerMinimumPrice: '50',
      makerMaximumAmount: '200'
    };
    
    console.log('📊 Tiny inputs:');
    console.log(`  Winner bits: ${tinyInputs.winnerBits}`);
    console.log(`  Bid price: ${tinyInputs.bidPrices[0]}`);
    console.log(`  Bid amount: ${tinyInputs.bidAmounts[0]}`);
    console.log(`  Min price: ${tinyInputs.makerMinimumPrice}`);
    console.log(`  Max amount: ${tinyInputs.makerMaximumAmount}`);
    
    // Manual validation
    const bidPrice = BigInt(tinyInputs.bidPrices[0]);
    const bidAmount = BigInt(tinyInputs.bidAmounts[0]);
    const minPrice = BigInt(tinyInputs.makerMinimumPrice);
    const maxAmount = BigInt(tinyInputs.makerMaximumAmount);
    
    console.log('🔍 Manual validation:');
    console.log(`  Price OK: ${bidPrice} >= ${minPrice} = ${bidPrice >= minPrice}`);
    console.log(`  Can fit: ${bidAmount} <= ${maxAmount} = ${bidAmount <= maxAmount}`);
    console.log(`  Should be winner: ${(bidPrice >= minPrice) && (bidAmount <= maxAmount)}`);
    console.log(`  JS winner bit: ${tinyInputs.winnerBits[0]}`);
    
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
      
      // Calculate witness with tiny inputs
      console.log('🔄 Calculating witness with tiny inputs...');
      const witness = await witnessCalculator.calculateWitness(tinyInputs);
      
      console.log('✅ Witness generation successful!');
      console.log(`📊 Witness length: ${witness.length}`);
      
      // Basic validation
      expect(witness.length).to.be.greaterThan(0);
      expect(witness[0]).to.equal(1n); // First element should be 1
      
      console.log('🎉 Tiny circuit test completed successfully!');
      
    } catch (error: any) {
      console.error('❌ Witness generation failed with tiny inputs:');
      console.error(error);
      
      // Try to extract more detailed error information
      if (error.message) {
        console.error('📋 Error details:');
        console.error(`  Message: ${error.message}`);
        
        // Look for specific constraint information
        if (error.message.includes('Assert Failed')) {
          console.error('💡 This is a constraint violation - even with tiny inputs');
          console.error('💡 The issue might be in the circuit implementation itself');
        }
      }
      
      throw error;
    }
  });
}); 