/**
 * Direct Witness Test - Using Witness Calculator
 * 
 * This test uses the witness calculator directly to get detailed error information
 * when witness generation fails.
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

// Import our utilities
import { generateCircuitInputs } from '../circuits/utils/input-generator';
import { simulateAuction, type Bid, type AuctionConstraints } from '../circuits/utils/auction-simulator';
import { generateCommitmentReal } from '../circuits/utils/hash-utils';

describe('Direct Witness Test - Using Witness Calculator', function() {
  it('should test witness generation directly with witness calculator', async function() {
    console.log('🧪 Testing witness generation with direct witness calculator...');
    
    // Use a simple test case
    const testBids: Bid[] = [
      { 
        price: 2000000000000000000n, 
        amount: 50000000000000000000n, 
        bidderAddress: '0x1111111111111111111111111111111111111111',
        originalIndex: 0
      }
    ];
    
    const constraints: AuctionConstraints = {
      makerMinimumPrice: 1500000000000000000n,
      makerMaximumAmount: 100000000000000000000n,
      commitmentContractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
    };
    
    // Generate circuit inputs
    const realCommitments = [];
    for (const bid of testBids) {
      const commitment = await generateCommitmentReal(bid, constraints.commitmentContractAddress);
      realCommitments.push(commitment.toString());
    }
    
    const circuitInputs = await generateCircuitInputs(
      testBids.map(bid => ({
        price: bid.price.toString(),
        amount: bid.amount.toString(),
        bidder: bid.bidderAddress
      })),
      realCommitments,
      constraints.makerMinimumPrice,
      constraints.makerMaximumAmount,
      constraints.commitmentContractAddress
    );
    
    console.log('📊 Generated circuit inputs:');
    console.log(`  Winner bits: ${circuitInputs.winnerBits}`);
    console.log(`  Bid prices: ${circuitInputs.bidPrices.slice(0, 2)}`);
    console.log(`  Commitments: ${circuitInputs.commitments.slice(0, 2)}`);
    
    // Check if compiled circuit files exist
    const wasmPath = path.join(__dirname, '../circuits/zkDutchAuction8_js/zkDutchAuction8.wasm');
    const witnessCalculatorPath = path.join(__dirname, '../circuits/zkDutchAuction8_js/witness_calculator.js');
    
    if (!fs.existsSync(wasmPath)) {
      throw new Error(`Compiled WASM file not found: ${wasmPath}`);
    }
    
    if (!fs.existsSync(witnessCalculatorPath)) {
      throw new Error(`Witness calculator not found: ${witnessCalculatorPath}`);
    }
    
    console.log('✅ Compiled circuit files found');
    
    // Try to use the witness calculator directly
    try {
      // Import the witness calculator builder
      const builder = require(witnessCalculatorPath);
      
      // Load the WASM file
      const wasmBuffer = fs.readFileSync(wasmPath);
      
      // Create witness calculator
      const witnessCalculator = await builder(wasmBuffer);
      
      console.log('✅ Witness calculator created successfully');
      
      // Convert inputs to the format expected by the witness calculator
      const witnessInputs: any = {};
      
      // Add all inputs in the order expected by the circuit
      Object.keys(circuitInputs).forEach(key => {
        const value = circuitInputs[key];
        if (Array.isArray(value)) {
          witnessInputs[key] = value;
        } else {
          witnessInputs[key] = [value];
        }
      });
      
      console.log('📊 Witness inputs prepared:');
      console.log(`  Input keys: ${Object.keys(witnessInputs)}`);
      
      // Calculate witness
      console.log('🔄 Calculating witness...');
      const witness = await witnessCalculator.calculateWitness(witnessInputs);
      
      console.log('✅ Witness generation successful!');
      console.log(`📊 Witness length: ${witness.length}`);
      
      // Basic validation
      expect(witness.length).to.be.greaterThan(0);
      expect(witness[0]).to.equal(1n); // First element should be 1
      
      console.log('🎉 Direct witness test completed successfully!');
      
    } catch (error: any) {
      console.error('❌ Witness generation failed with direct calculator:');
      console.error(error);
      
      // Try to extract more detailed error information
      if (error.message) {
        console.error('📋 Error details:');
        console.error(`  Message: ${error.message}`);
        
        // Look for specific constraint information
        if (error.message.includes('Assert Failed')) {
          console.error('💡 This is a constraint violation - the circuit logic is rejecting our inputs');
        }
        
        if (error.message.includes('line')) {
          console.error('💡 The error indicates a specific line in the circuit');
        }
      }
      
      throw error;
    }
  });
}); 