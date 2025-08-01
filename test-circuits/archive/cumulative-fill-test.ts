/**
 * Cumulative Fill Test - Debugging the Cumulative Fill Logic
 * 
 * This test focuses on the cumulative fill calculation to see if that's causing the issue.
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';

describe('Cumulative Fill Test - Debugging the Logic', function() {
  it('should debug the cumulative fill calculation logic', async function() {
    console.log('🔍 Debugging cumulative fill calculation...');
    
    // Test case where cumulative fill might be the issue
    const testBids = [
      { price: 2000000000000000000n, amount: 50000000000000000000n },
      { price: 1800000000000000000n, amount: 30000000000000000000n }
    ];
    
    const constraints = {
      makerMinimumPrice: 1500000000000000000n,
      makerMaximumAmount: 100000000000000000000n
    };
    
    console.log('📊 Test case:');
    console.log(`  Bid 0: price=${testBids[0].price}, amount=${testBids[0].amount}`);
    console.log(`  Bid 1: price=${testBids[1].price}, amount=${testBids[1].amount}`);
    console.log(`  Max amount: ${constraints.makerMaximumAmount}`);
    
    // Simulate circuit logic step by step
    console.log('🔍 Circuit logic simulation:');
    
    let cumulativeFill = 0n;
    
    for (let i = 0; i < testBids.length; i++) {
      const bid = testBids[i];
      
      // Circuit logic: canFit[i] = (cumulativeFill[i] + sortedAmounts[i]) < (makerMaximumAmount + 1)
      const canFit = (cumulativeFill + bid.amount) < (constraints.makerMaximumAmount + 1n);
      
      // Circuit logic: priceOK[i] = sortedPrices[i] >= makerMinimumPrice
      const priceOK = bid.price >= constraints.makerMinimumPrice;
      
      // Circuit logic: isWinner[i] = canFit[i].out * priceOK[i].out
      const isWinner = canFit && priceOK;
      
      console.log(`  Bid ${i}:`);
      console.log(`    Cumulative fill: ${cumulativeFill}`);
      console.log(`    Can fit: ${cumulativeFill} + ${bid.amount} < ${constraints.makerMaximumAmount + 1n} = ${canFit}`);
      console.log(`    Price OK: ${bid.price} >= ${constraints.makerMinimumPrice} = ${priceOK}`);
      console.log(`    Is winner: ${canFit} && ${priceOK} = ${isWinner}`);
      
      // Update cumulative fill for next iteration
      if (isWinner) {
        cumulativeFill += bid.amount;
        console.log(`    Updated cumulative fill: ${cumulativeFill}`);
      }
    }
    
    console.log(`📊 Final cumulative fill: ${cumulativeFill}`);
    
    // Check if this matches our expected behavior
    const expectedTotalFill = 50000000000000000000n + 30000000000000000000n;
    console.log(`  Expected total fill: ${expectedTotalFill}`);
    console.log(`  Match: ${cumulativeFill === expectedTotalFill ? '✅' : '❌'}`);
    
    expect(cumulativeFill).to.equal(expectedTotalFill);
  });
}); 