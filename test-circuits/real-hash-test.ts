/**
 * Real Hash Test - Verify if real Poseidon hashes fix circuit witness generation
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

// Import our validated input generator and real hash function
import { generateCircuitInputs } from '../circuits/utils/input-generator';
import { generateCommitmentReal } from '../circuits/utils/hash-utils';

describe('Real Hash Circuit Test', function() {
  
  it('should generate circuit inputs with real Poseidon hashes', async function() {
    console.log('🧪 Testing circuit inputs with real Poseidon hashes...');
    
    // Use the same test case that passed our functional validation
    const testBids = [
      { price: '2000000000000000000', amount: '50000000000000000000', bidder: '0x1111111111111111111111111111111111111111' },
      { price: '1800000000000000000', amount: '30000000000000000000', bidder: '0x2222222222222222222222222222222222222222' }
    ];
    const contractAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

    // Generate real Poseidon commitments
    const realCommitments = [];
    for (const bid of testBids) {
      const commitment = await generateCommitmentReal({
        price: BigInt(bid.price),
        amount: BigInt(bid.amount),
        bidderAddress: bid.bidder,
        originalIndex: 0
      }, contractAddress);
      realCommitments.push(commitment.toString());
    }

    console.log('📊 Real Poseidon commitments:');
    realCommitments.forEach((commitment, i) => {
      console.log(`  Bid ${i}: ${commitment}`);
    });

    // Generate circuit inputs with real commitments
    const inputs = await generateCircuitInputs(
      testBids, 
      realCommitments, 
      '1500000000000000000', 
      '100000000000000000000', 
      contractAddress
    );
    
    console.log('✅ Circuit inputs generated with real hashes!');
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
    const filepath = path.join(inputsDir, 'real-hash-inputs.json');
    fs.writeFileSync(filepath, JSON.stringify(inputs, null, 2));
    console.log(`💾 Real hash inputs saved to: ${filepath}`);
    
    // Validate that commitments match
    for (let i = 0; i < realCommitments.length; i++) {
      expect(inputs.commitments[i]).to.equal(realCommitments[i]);
    }
    
    console.log('✅ All real commitments match!');
  });
}); 