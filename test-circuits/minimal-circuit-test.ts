/**
 * Minimal Circuit Test - Isolating the Circuit Issue
 * 
 * This test uses the most minimal possible inputs to isolate the circuit issue.
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

describe('Minimal Circuit Test - Isolating the Issue', function() {
  it('should test with minimal inputs to isolate the circuit issue', async function() {
    console.log('🧪 Testing with minimal inputs...');
    
    // Create the most minimal possible inputs
    const minimalInputs = {
      bidPrices: ['1000000000000000000', '0', '0', '0', '0', '0', '0', '0'],
      bidAmounts: ['1000000000000000000', '0', '0', '0', '0', '0', '0', '0'],
      bidderAddresses: ['1000000000000000000000000000000000000000', '0', '0', '0', '0', '0', '0', '0'],
      sortedPrices: ['1000000000000000000', '0', '0', '0', '0', '0', '0', '0'],
      sortedAmounts: ['1000000000000000000', '0', '0', '0', '0', '0', '0', '0'],
      sortedIndices: ['0', '1', '2', '3', '4', '5', '6', '7'],
      winnerBits: ['1', '0', '0', '0', '0', '0', '0', '0'],
      commitments: ['1000000000000000000000000000000000000000000000000000000000000000', '0', '0', '0', '0', '0', '0', '0'],
      commitmentContractAddress: '1000000000000000000000000000000000000000',
      makerMinimumPrice: '500000000000000000',
      makerMaximumAmount: '2000000000000000000'
    };
    
    console.log('📊 Minimal inputs:');
    console.log(`  Winner bits: ${minimalInputs.winnerBits}`);
    console.log(`  Bid price: ${minimalInputs.bidPrices[0]}`);
    console.log(`  Bid amount: ${minimalInputs.bidAmounts[0]}`);
    console.log(`  Min price: ${minimalInputs.makerMinimumPrice}`);
    console.log(`  Max amount: ${minimalInputs.makerMaximumAmount}`);
    
    // Manual validation
    const bidPrice = BigInt(minimalInputs.bidPrices[0]);
    const bidAmount = BigInt(minimalInputs.bidAmounts[0]);
    const minPrice = BigInt(minimalInputs.makerMinimumPrice);
    const maxAmount = BigInt(minimalInputs.makerMaximumAmount);
    
    console.log('🔍 Manual validation:');
    console.log(`  Price OK: ${bidPrice} >= ${minPrice} = ${bidPrice >= minPrice}`);
    console.log(`  Can fit: ${bidAmount} <= ${maxAmount} = ${bidAmount <= maxAmount}`);
    console.log(`  Should be winner: ${(bidPrice >= minPrice) && (bidAmount <= maxAmount)}`);
    console.log(`  JS winner bit: ${minimalInputs.winnerBits[0]}`);
    
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
      
      // Calculate witness with minimal inputs
      console.log('🔄 Calculating witness with minimal inputs...');
      const witness = await witnessCalculator.calculateWitness(minimalInputs);
      
      console.log('✅ Witness generation successful!');
      console.log(`📊 Witness length: ${witness.length}`);
      
      // Basic validation
      expect(witness.length).to.be.greaterThan(0);
      expect(witness[0]).to.equal(1n); // First element should be 1
      
      console.log('🎉 Minimal circuit test completed successfully!');
      
    } catch (error: any) {
      console.error('❌ Witness generation failed with minimal inputs:');
      console.error(error);
      
      // Try to extract more detailed error information
      if (error.message) {
        console.error('📋 Error details:');
        console.error(`  Message: ${error.message}`);
        
        // Look for specific constraint information
        if (error.message.includes('Assert Failed')) {
          console.error('💡 This is a constraint violation - even with minimal inputs');
          console.error('💡 The issue might be in the circuit implementation itself');
        }
      }
      
      throw error;
    }
  });
}); 