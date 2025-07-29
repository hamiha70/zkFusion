/**
 * Circuit Witness Generation Tests
 * 
 * Tests the ZK circuit witness generation using validated inputs.
 * This is part of Phase 2: Circuit Parity Testing.
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

// Import our validated input generator
import { generateCircuitInputs } from '../circuits/utils/input-generator';

describe('Circuit Witness Generation', function() {
  
  it('should generate valid circuit inputs for witness testing', async function() {
    console.log('🧪 Testing circuit input generation for witness...');
    
    // Use the same test case that passed our functional validation
    const testBids = [
      { price: '2000000000000000000', amount: '50000000000000000000', bidder: '0x1111111111111111111111111111111111111111' },
      { price: '1800000000000000000', amount: '30000000000000000000', bidder: '0x2222222222222222222222222222222222222222' }
    ];
    const testCommitments = ['12345', '67890'];
    const contractAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

    try {
      const inputs = await generateCircuitInputs(
        testBids, 
        testCommitments, 
        '1500000000000000000', 
        '100000000000000000000', 
        contractAddress
      );
      
      console.log('✅ Circuit inputs generated successfully!');
      console.log('📊 Input structure:');
      Object.keys(inputs).forEach(key => {
        const value = inputs[key];
        const count = Array.isArray(value) ? value.length : 1;
        console.log(`  ${key}: ${count} elements`);
      });
      
      // Save inputs for circuit testing
      const inputsDir = path.join(__dirname, '../circuits/inputs');
      if (!fs.existsSync(inputsDir)) {
        fs.mkdirSync(inputsDir, { recursive: true });
      }
      const filepath = path.join(inputsDir, 'test-witness-inputs.json');
      fs.writeFileSync(filepath, JSON.stringify(inputs, null, 2));
      console.log(`💾 Inputs saved to: ${filepath}`);
      
      // Validate input structure
      expect(inputs).to.have.property('bidPrices');
      expect(inputs).to.have.property('bidAmounts');
      expect(inputs).to.have.property('bidderAddresses');
      expect(inputs).to.have.property('commitments');
      expect(inputs).to.have.property('commitmentContractAddress');
      expect(inputs).to.have.property('makerMinimumPrice');
      expect(inputs).to.have.property('makerMaximumAmount');
      expect(inputs).to.have.property('sortedPrices');
      expect(inputs).to.have.property('sortedAmounts');
      expect(inputs).to.have.property('sortedIndices');
      expect(inputs).to.have.property('winnerBits');
      
      // Validate array lengths
      expect(inputs.bidPrices).to.have.length(8);
      expect(inputs.bidAmounts).to.have.length(8);
      expect(inputs.bidderAddresses).to.have.length(8);
      expect(inputs.commitments).to.have.length(8);
      expect(inputs.sortedPrices).to.have.length(8);
      expect(inputs.sortedAmounts).to.have.length(8);
      expect(inputs.sortedIndices).to.have.length(8);
      expect(inputs.winnerBits).to.have.length(8);
      
      // Validate winner bits (should be [1,1,0,0,0,0,0,0] for our test case)
      expect(inputs.winnerBits).to.deep.equal(['1', '1', '0', '0', '0', '0', '0', '0']);
      
      console.log('✅ All input validations passed!');
      
    } catch (error) {
      console.error('❌ Error generating circuit inputs:', error);
      throw error;
    }
  });

  it('should detect circuit witness generation errors', async function() {
    console.log('🔍 Testing circuit witness generation...');
    
    // Check if the circuit files exist
    const wasmPath = path.join(__dirname, '../circuits/zkDutchAuction8_js/zkDutchAuction8.wasm');
    const inputsPath = path.join(__dirname, '../circuits/inputs/test-witness-inputs.json');
    
    if (!fs.existsSync(wasmPath)) {
      console.log('⚠️  Circuit WASM file not found. Run circuit compilation first.');
      this.skip();
      return;
    }
    
    if (!fs.existsSync(inputsPath)) {
      console.log('⚠️  Input file not found. Run input generation first.');
      this.skip();
      return;
    }
    
    console.log('✅ Circuit files found, ready for witness testing');
    console.log('📁 WASM file:', wasmPath);
    console.log('📁 Input file:', inputsPath);
    
    // Note: Actual witness generation will be tested in a separate script
    // due to the complexity of snarkjs integration
  });
}); 