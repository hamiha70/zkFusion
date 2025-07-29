/**
 * Comparator Test - Checking Comparator Component Issues
 * 
 * This test checks if the issue is with the LessThan(64) and GreaterEqThan(64) components.
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';

describe('Comparator Test - Checking Component Issues', function() {
  it('should check if comparator components are causing the issue', async function() {
    console.log('🔍 Checking comparator component issues...');
    
    // Test the values that go into the comparators
    const testValues = {
      cumulativeFill: BigInt('50000000000000000000'),
      sortedAmount: BigInt('30000000000000000000'),
      maxAmount: BigInt('100000000000000000000'),
      bidPrice: BigInt('2000000000000000000'),
      minPrice: BigInt('1500000000000000000')
    };
    
    console.log('📊 Test values:');
    console.log(`  Cumulative fill: ${testValues.cumulativeFill}`);
    console.log(`  Sorted amount: ${testValues.sortedAmount}`);
    console.log(`  Max amount: ${testValues.maxAmount}`);
    console.log(`  Bid price: ${testValues.bidPrice}`);
    console.log(`  Min price: ${testValues.minPrice}`);
    
    // Test the comparator inputs
    console.log('🔍 Comparator inputs:');
    
    // LessThan(64) inputs
    const canFitInput1 = testValues.cumulativeFill + testValues.sortedAmount;
    const canFitInput2 = testValues.maxAmount + 1n;
    
    console.log(`  CanFit input 1: ${canFitInput1}`);
    console.log(`  CanFit input 2: ${canFitInput2}`);
    console.log(`  CanFit result: ${canFitInput1 < canFitInput2}`);
    
    // GreaterEqThan(64) inputs
    const priceOKInput1 = testValues.bidPrice;
    const priceOKInput2 = testValues.minPrice;
    
    console.log(`  PriceOK input 1: ${priceOKInput1}`);
    console.log(`  PriceOK input 2: ${priceOKInput2}`);
    console.log(`  PriceOK result: ${priceOKInput1 >= priceOKInput2}`);
    
    // Check bit lengths
    console.log('🔍 Bit length analysis:');
    console.log(`  CanFit input 1 bits: ${canFitInput1.toString(2).length}`);
    console.log(`  CanFit input 2 bits: ${canFitInput2.toString(2).length}`);
    console.log(`  PriceOK input 1 bits: ${priceOKInput1.toString(2).length}`);
    console.log(`  PriceOK input 2 bits: ${priceOKInput2.toString(2).length}`);
    
    // Check if any values exceed 64 bits
    const max64Bit = (1n << 64n) - 1n;
    console.log(`  Max 64-bit value: ${max64Bit}`);
    
    const canFitInput1OK = canFitInput1 <= max64Bit;
    const canFitInput2OK = canFitInput2 <= max64Bit;
    const priceOKInput1OK = priceOKInput1 <= max64Bit;
    const priceOKInput2OK = priceOKInput2 <= max64Bit;
    
    console.log(`  CanFit input 1 <= 64 bits: ${canFitInput1OK ? '✅' : '❌'}`);
    console.log(`  CanFit input 2 <= 64 bits: ${canFitInput2OK ? '✅' : '❌'}`);
    console.log(`  PriceOK input 1 <= 64 bits: ${priceOKInput1OK ? '✅' : '❌'}`);
    console.log(`  PriceOK input 2 <= 64 bits: ${priceOKInput2OK ? '✅' : '❌'}`);
    
    // All inputs should be within 64-bit range
    const allWithin64Bits = canFitInput1OK && canFitInput2OK && priceOKInput1OK && priceOKInput2OK;
    console.log(`📊 All inputs within 64 bits: ${allWithin64Bits ? '✅' : '❌'}`);
    
    expect(allWithin64Bits).to.be.true;
  });
}); 