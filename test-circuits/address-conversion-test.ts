/**
 * Address Conversion Test - Verify the Root Cause
 * 
 * This test verifies that the address conversion difference is causing the hash mismatch.
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { realPoseidonHash } from '../circuits/utils/hash-utils';

describe('Address Conversion Test - Verify the Root Cause', function() {
  it('should identify the address conversion issue', async function() {
    console.log('🔍 Testing address conversion differences...');
    
    // Test the two different address formats
    const rawBigInt = 1000000000000000000000000000000000000000n;
    const hexString = '0x1000000000000000000000000000000000000000';
    const convertedBigInt = BigInt('0x' + hexString.replace('0x', ''));
    
    console.log('📊 Address conversion comparison:');
    console.log(`  Raw BigInt: ${rawBigInt.toString()}`);
    console.log(`  Hex String: ${hexString}`);
    console.log(`  Converted: ${convertedBigInt.toString()}`);
    console.log(`  Match: ${rawBigInt === convertedBigInt ? '✅ YES' : '❌ NO'}`);
    
    // Test hash with raw BigInt (what circuit expects)
    const inputsRaw = [
      1000000000000000000n,  // price
      1000000000000000000n,  // amount
      rawBigInt,             // bidder address (raw)
      rawBigInt              // contract address (raw)
    ];
    
    const hashRaw = await realPoseidonHash(inputsRaw);
    console.log('\n✅ Hash with raw BigInt addresses:');
    console.log(`  ${hashRaw.toString()}`);
    
    // Test hash with converted BigInt (what our function uses)
    const inputsConverted = [
      1000000000000000000n,  // price
      1000000000000000000n,  // amount
      convertedBigInt,        // bidder address (converted)
      convertedBigInt         // contract address (converted)
    ];
    
    const hashConverted = await realPoseidonHash(inputsConverted);
    console.log('\n✅ Hash with converted BigInt addresses:');
    console.log(`  ${hashConverted.toString()}`);
    
    console.log('\n🔍 Hash comparison:');
    console.log(`  Raw addresses: ${hashRaw.toString()}`);
    console.log(`  Converted: ${hashConverted.toString()}`);
    console.log(`  Match: ${hashRaw === hashConverted ? '✅ YES' : '❌ NO'}`);
    
    // This should reveal the exact issue
    if (hashRaw !== hashConverted) {
      console.log('\n🎯 ROOT CAUSE CONFIRMED:');
      console.log('The address conversion method is causing different hash results.');
      console.log('The circuit expects raw BigInt addresses, but our function converts them.');
    }
    
    // Verify which one matches our corrected test
    const expectedHash = 15104133724777514810523172317184844021064373930897486633132722970634562369023n;
    console.log('\n🎯 Expected hash from corrected test:');
    console.log(`  ${expectedHash.toString()}`);
    
    console.log('\n🔍 Which format matches the expected?');
    console.log(`  Raw matches: ${hashRaw === expectedHash ? '✅ YES' : '❌ NO'}`);
    console.log(`  Converted matches: ${hashConverted === expectedHash ? '✅ YES' : '❌ NO'}`);
    
    // This tells us which format the circuit actually expects
    if (hashRaw === expectedHash) {
      console.log('\n✅ SOLUTION: Use raw BigInt addresses (no conversion)');
    } else if (hashConverted === expectedHash) {
      console.log('\n✅ SOLUTION: Use converted BigInt addresses (current method)');
    } else {
      console.log('\n❌ NEITHER MATCHES - There is another issue');
    }
  });
}); 