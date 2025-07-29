/**
 * Debug Circuit Inputs Test
 * 
 * Debug the circuit witness generation by checking input compatibility.
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';

// Import our validated input generator
import { generateCircuitInputs } from '../circuits/utils/input-generator';
import { generateCommitment } from '../circuits/utils/hash-utils';

describe('Debug Circuit Inputs', function() {
  
  it('should verify commitment calculation matches circuit expectations', async function() {
    console.log('🔍 Debugging circuit input compatibility...');
    
    // Use simple test data
    const testBids = [
      { price: '2000000000000000000', amount: '50000000000000000000', bidder: '0x1111111111111111111111111111111111111111' },
      { price: '1800000000000000000', amount: '30000000000000000000', bidder: '0x2222222222222222222222222222222222222222' }
    ];
    const contractAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

    // Generate commitments using our hash logic
    const commitments = testBids.map(bid => {
      const commitment = generateCommitment({
        price: BigInt(bid.price),
        amount: BigInt(bid.amount),
        bidderAddress: bid.bidder,
        originalIndex: 0
      }, contractAddress);
      return commitment.toString();
    });

    console.log('📊 Generated commitments:');
    commitments.forEach((commitment, i) => {
      console.log(`  Bid ${i}: ${commitment}`);
    });

    // Generate circuit inputs
    const inputs = await generateCircuitInputs(
      testBids, 
      commitments, 
      '1500000000000000000', 
      '100000000000000000000', 
      contractAddress
    );

    console.log('📊 Circuit input commitments:');
    inputs.commitments.forEach((commitment: string, i: number) => {
      console.log(`  Input ${i}: ${commitment}`);
    });

    // Check if commitments match
    for (let i = 0; i < commitments.length; i++) {
      const expected = commitments[i];
      const actual = inputs.commitments[i];
      console.log(`  Commitment ${i}: Expected=${expected}, Actual=${actual}`);
      expect(actual).to.equal(expected);
    }

    console.log('✅ All commitments match!');
  });

  it('should verify input structure matches circuit expectations', async function() {
    console.log('🔍 Checking input structure...');
    
    const testBids = [
      { price: '2000000000000000000', amount: '50000000000000000000', bidder: '0x1111111111111111111111111111111111111111' }
    ];
    const testCommitments = ['12345'];
    const contractAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

    const inputs = await generateCircuitInputs(
      testBids, 
      testCommitments, 
      '1500000000000000000', 
      '100000000000000000000', 
      contractAddress
    );

    // Check that all required inputs are present
    const requiredInputs = [
      'bidPrices', 'bidAmounts', 'bidderAddresses',
      'sortedPrices', 'sortedAmounts', 'sortedIndices', 'winnerBits',
      'commitments', 'commitmentContractAddress', 'makerMinimumPrice', 'makerMaximumAmount'
    ];

    requiredInputs.forEach(inputName => {
      expect(inputs).to.have.property(inputName);
      console.log(`✅ ${inputName}: ${Array.isArray(inputs[inputName]) ? inputs[inputName].length : 1} elements`);
    });

    // Check array lengths
    const arrayInputs = ['bidPrices', 'bidAmounts', 'bidderAddresses', 'sortedPrices', 'sortedAmounts', 'sortedIndices', 'winnerBits', 'commitments'];
    arrayInputs.forEach(inputName => {
      expect(inputs[inputName]).to.have.length(8);
    });

    console.log('✅ Input structure validation passed!');
  });
}); 