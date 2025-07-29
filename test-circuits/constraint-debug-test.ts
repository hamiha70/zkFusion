/**
 * Constraint Debug Test - Systematic Constraint Analysis
 * 
 * This test systematically checks each constraint to find the exact mismatch
 * that's causing the Assert Failed at line 97.
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';

// Import our utilities
import { generateCircuitInputs } from '../circuits/utils/input-generator';
import { simulateAuction, type Bid, type AuctionConstraints } from '../circuits/utils/auction-simulator';
import { generateCommitmentReal } from '../circuits/utils/hash-utils';

describe('Constraint Debug Test - Systematic Analysis', function() {
  it('should systematically debug each constraint to find the exact mismatch', async function() {
    console.log('🔍 Systematic constraint debugging...');
    
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
    
    console.log('📊 Circuit inputs analysis:');
    console.log(`  Winner bits: ${circuitInputs.winnerBits}`);
    console.log(`  Sorted prices: ${circuitInputs.sortedPrices}`);
    console.log(`  Sorted amounts: ${circuitInputs.sortedAmounts}`);
    console.log(`  Maker min price: ${circuitInputs.makerMinimumPrice}`);
    console.log(`  Maker max amount: ${circuitInputs.makerMaximumAmount}`);
    
    // Manually simulate the circuit logic step by step
    console.log('🔍 Manual circuit logic simulation:');
    
    const sortedPrices = circuitInputs.sortedPrices.map((p: string) => BigInt(p));
    const sortedAmounts = circuitInputs.sortedAmounts.map((a: string) => BigInt(a));
    const winnerBits = circuitInputs.winnerBits.map((b: string) => parseInt(b));
    const minPrice = BigInt(circuitInputs.makerMinimumPrice);
    const maxAmount = BigInt(circuitInputs.makerMaximumAmount);
    
    let cumulativeFill = 0n;
    const circuitWinners: boolean[] = [];
    
    for (let i = 0; i < 8; i++) {
      const price = sortedPrices[i];
      const amount = sortedAmounts[i];
      
      // Circuit logic: canFit[i] = (cumulativeFill[i] + sortedAmounts[i]) < (makerMaximumAmount + 1)
      const canFit = (cumulativeFill + amount) < (maxAmount + 1n);
      
      // Circuit logic: priceOK[i] = sortedPrices[i] >= makerMinimumPrice
      const priceOK = price >= minPrice;
      
      // Circuit logic: isWinner[i] = canFit[i].out * priceOK[i].out
      const isWinner = canFit && priceOK;
      
      circuitWinners.push(isWinner);
      
      console.log(`  Bid ${i}:`);
      console.log(`    Price: ${price}, Amount: ${amount}`);
      console.log(`    Cumulative fill: ${cumulativeFill}`);
      console.log(`    Can fit: ${cumulativeFill} + ${amount} < ${maxAmount + 1n} = ${canFit}`);
      console.log(`    Price OK: ${price} >= ${minPrice} = ${priceOK}`);
      console.log(`    Circuit winner: ${canFit} && ${priceOK} = ${isWinner}`);
      console.log(`    JS winner bit: ${winnerBits[i]}`);
      console.log(`    Match: ${(winnerBits[i] === 1) === isWinner ? '✅' : '❌'}`);
      
      if (isWinner) {
        cumulativeFill += amount;
      }
    }
    
    console.log('📊 Summary:');
    console.log(`  Circuit winners: ${circuitWinners.map(w => w ? 1 : 0)}`);
    console.log(`  JS winner bits: ${winnerBits}`);
    
    // Find the first mismatch
    let firstMismatch = -1;
    for (let i = 0; i < 8; i++) {
      if ((winnerBits[i] === 1) !== circuitWinners[i]) {
        firstMismatch = i;
        break;
      }
    }
    
    if (firstMismatch >= 0) {
      console.log(`❌ First mismatch at index ${firstMismatch}:`);
      console.log(`  JS winner bit: ${winnerBits[firstMismatch]}`);
      console.log(`  Circuit winner: ${circuitWinners[firstMismatch]}`);
      console.log(`  Price: ${sortedPrices[firstMismatch]}`);
      console.log(`  Amount: ${sortedAmounts[firstMismatch]}`);
      console.log(`  Cumulative fill: ${cumulativeFill}`);
    } else {
      console.log('✅ All constraints match!');
    }
    
    // This should help us understand why the circuit is failing
    expect(firstMismatch).to.equal(-1, 'All constraints should match');
  });
}); 