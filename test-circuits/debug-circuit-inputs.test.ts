/**
 * Debug Circuit Inputs - Compare JavaScript vs Circuit Winner Logic
 * 
 * This test helps identify why the circuit constraint at line 97 is failing.
 * We'll compare how JavaScript calculates winners vs how the circuit calculates winners.
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { generateCircuitInputs } from '../circuits/utils/input-generator';
import { simulateAuction, type Bid, type AuctionConstraints } from '../circuits/utils/auction-simulator';
import { generateCommitmentReal } from '../circuits/utils/hash-utils';

describe('Debug Circuit Inputs - Winner Logic Comparison', function() {
  
  it('should debug winner calculation mismatch between JS and Circuit', async function() {
    console.log('🔍 Debugging winner calculation mismatch...');
    
    // Use the same test case that's failing
    const testBids: Bid[] = [
      { 
        price: 2000000000000000000n, 
        amount: 50000000000000000000n, 
        bidderAddress: '0x1111111111111111111111111111111111111111',
        originalIndex: 0
      },
      { 
        price: 1800000000000000000n, 
        amount: 30000000000000000000n, 
        bidderAddress: '0x2222222222222222222222222222222222222222',
        originalIndex: 1
      }
    ];
    
    const constraints: AuctionConstraints = {
      makerMinimumPrice: 1500000000000000000n,
      makerMaximumAmount: 100000000000000000000n,
      commitmentContractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
    };
    
    // 1. JavaScript winner calculation
    const jsResult = simulateAuction(testBids, constraints);
    console.log('📊 JavaScript Auction Result:');
    console.log(`  Winners: ${jsResult.numWinners}`);
    console.log(`  Total fill: ${jsResult.totalFill}`);
    console.log(`  Winner bitmask: ${jsResult.winnerBitmask} (binary: ${jsResult.winnerBitmask.toString(2)})`);
    
    // 2. Generate real commitments
    const realCommitments = [];
    for (const bid of testBids) {
      const commitment = await generateCommitmentReal(bid, constraints.commitmentContractAddress);
      realCommitments.push(commitment.toString());
    }
    
    // 3. Generate circuit inputs
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
    
    console.log('📊 Circuit Inputs Analysis:');
    console.log('  Bid Prices:', circuitInputs.bidPrices);
    console.log('  Bid Amounts:', circuitInputs.bidAmounts);
    console.log('  Sorted Prices:', circuitInputs.sortedPrices);
    console.log('  Sorted Amounts:', circuitInputs.sortedAmounts);
    console.log('  Winner Bits:', circuitInputs.winnerBits);
    console.log('  Maker Min Price:', circuitInputs.makerMinimumPrice);
    console.log('  Maker Max Amount:', circuitInputs.makerMaximumAmount);
    
    // 4. Manual circuit winner calculation simulation
    console.log('🔍 Manual Circuit Winner Calculation:');
    
    const N = 8;
    const sortedPrices = circuitInputs.sortedPrices.map((p: string) => BigInt(p));
    const sortedAmounts = circuitInputs.sortedAmounts.map((a: string) => BigInt(a));
    const minPrice = BigInt(circuitInputs.makerMinimumPrice);
    const maxAmount = BigInt(circuitInputs.makerMaximumAmount);
    
    let cumulativeFill = 0n;
    const circuitWinners = [];
    
    for (let i = 0; i < N; i++) {
      const price = sortedPrices[i];
      const amount = sortedAmounts[i];
      
      // Circuit logic: canFit[i] = (cumulativeFill + amount) < maxAmount
      const canFit = (cumulativeFill + amount) < maxAmount;
      
      // Circuit logic: priceOK[i] = price >= minPrice  
      const priceOK = price >= minPrice;
      
      // Circuit logic: isWinner[i] = canFit * priceOK
      const isWinner = canFit && priceOK;
      
      circuitWinners.push(isWinner ? 1 : 0);
      
      if (isWinner) {
        cumulativeFill += amount;
      }
      
      console.log(`  Bid ${i}: price=${price}, amount=${amount}, canFit=${canFit}, priceOK=${priceOK}, isWinner=${isWinner}`);
    }
    
    console.log('📊 Circuit Winner Array:', circuitWinners);
    console.log('📊 JavaScript Winner Bits:', circuitInputs.winnerBits);
    
    // 5. Compare results
    const jsWinnerBits = circuitInputs.winnerBits.map((bit: string) => parseInt(bit));
    const mismatch = [];
    
    for (let i = 0; i < N; i++) {
      if (circuitWinners[i] !== jsWinnerBits[i]) {
        mismatch.push({
          index: i,
          circuitWinner: circuitWinners[i],
          jsWinner: jsWinnerBits[i],
          price: sortedPrices[i],
          amount: sortedAmounts[i]
        });
      }
    }
    
    if (mismatch.length > 0) {
      console.log('❌ WINNER CALCULATION MISMATCH FOUND:');
      mismatch.forEach(m => {
        console.log(`  Index ${m.index}: Circuit=${m.circuitWinner}, JS=${m.jsWinner}, Price=${m.price}, Amount=${m.amount}`);
      });
      
      // This explains the Assert Failed at line 97!
      console.log('💡 ROOT CAUSE: Circuit and JavaScript calculate winners differently');
      console.log('   Circuit uses: (cumulativeFill + amount) < maxAmount && price >= minPrice');
      console.log('   JavaScript uses: Greedy fill algorithm with different logic');
      
    } else {
      console.log('✅ Winner calculations match!');
    }
    
    // 6. Expected circuit behavior
    console.log('🎯 Expected Circuit Behavior:');
    console.log(`  - First bid: price=${sortedPrices[0]}, amount=${sortedAmounts[0]}`);
    console.log(`  - Can fit: ${sortedAmounts[0]} < ${maxAmount} = ${sortedAmounts[0] < maxAmount}`);
    console.log(`  - Price OK: ${sortedPrices[0]} >= ${minPrice} = ${sortedPrices[0] >= minPrice}`);
    console.log(`  - Should be winner: ${(sortedAmounts[0] < maxAmount) && (sortedPrices[0] >= minPrice)}`);
    
    expect(mismatch.length).to.equal(0, 'Winner calculations should match between JS and Circuit');
  });

  it('should debug the exact constraint validation at line 97', async function() {
    console.log('🔍 Debugging exact constraint validation at line 97...');
    
    // Use the same test case
    const testBids: Bid[] = [
      { 
        price: 2000000000000000000n, 
        amount: 50000000000000000000n, 
        bidderAddress: '0x1111111111111111111111111111111111111111',
        originalIndex: 0
      },
      { 
        price: 1800000000000000000n, 
        amount: 30000000000000000000n, 
        bidderAddress: '0x2222222222222222222222222222222222222222',
        originalIndex: 1
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
    
    console.log('🔍 Analyzing constraint validation at line 97...');
    console.log('Line 97 constraint: bitValidator[i].out === 1');
    console.log('This means: winnerBits[i] === isWinner[i]');
    
    // Check each winner bit against expected isWinner value
    const N = 8;
    const sortedPrices = circuitInputs.sortedPrices.map((p: string) => BigInt(p));
    const sortedAmounts = circuitInputs.sortedAmounts.map((a: string) => BigInt(a));
    const minPrice = BigInt(circuitInputs.makerMinimumPrice);
    const maxAmount = BigInt(circuitInputs.makerMaximumAmount);
    const winnerBits = circuitInputs.winnerBits.map((bit: string) => parseInt(bit));
    
    let cumulativeFill = 0n;
    const constraintViolations = [];
    
    for (let i = 0; i < N; i++) {
      const price = sortedPrices[i];
      const amount = sortedAmounts[i];
      const jsWinnerBit = winnerBits[i];
      
      // Circuit logic for isWinner[i]
      const canFit = (cumulativeFill + amount) < maxAmount;
      const priceOK = price >= minPrice;
      const circuitIsWinner = canFit && priceOK;
      
      // Check if winnerBits[i] matches isWinner[i]
      const constraintOK = (jsWinnerBit === 1) === circuitIsWinner;
      
      if (!constraintOK) {
        constraintViolations.push({
          index: i,
          jsWinnerBit,
          circuitIsWinner,
          price,
          amount,
          canFit,
          priceOK,
          cumulativeFill
        });
      }
      
      if (circuitIsWinner) {
        cumulativeFill += amount;
      }
      
      console.log(`  Bid ${i}: winnerBit=${jsWinnerBit}, circuitWinner=${circuitIsWinner}, constraintOK=${constraintOK}`);
    }
    
    if (constraintViolations.length > 0) {
      console.log('❌ CONSTRAINT VIOLATIONS FOUND:');
      constraintViolations.forEach(v => {
        console.log(`  Index ${v.index}: winnerBit=${v.jsWinnerBit}, circuitWinner=${v.circuitIsWinner}`);
        console.log(`    Price: ${v.price}, Amount: ${v.amount}`);
        console.log(`    CanFit: ${v.canFit}, PriceOK: ${v.priceOK}`);
        console.log(`    CumulativeFill: ${v.cumulativeFill}`);
      });
    } else {
      console.log('✅ All constraints should pass!');
      console.log('💡 The issue might be elsewhere in the circuit...');
    }
    
    // Check if there are any other potential issues
    console.log('🔍 Additional checks:');
    console.log('  - All field elements valid:', circuitInputs.bidPrices.every((p: string) => BigInt(p) >= 0n));
    console.log('  - Commitments match expectations:', circuitInputs.commitments.length === 8);
    console.log('  - Sorting arrays valid:', circuitInputs.sortedPrices.length === 8);
    
    expect(constraintViolations.length).to.equal(0, 'All winner bit constraints should be satisfied');
  });

  it('should isolate the exact failing constraint by testing components separately', async function() {
    console.log('🔍 Isolating the exact failing constraint...');
    
    // Use the same test case
    const testBids: Bid[] = [
      { 
        price: 2000000000000000000n, 
        amount: 50000000000000000000n, 
        bidderAddress: '0x1111111111111111111111111111111111111111',
        originalIndex: 0
      },
      { 
        price: 1800000000000000000n, 
        amount: 30000000000000000000n, 
        bidderAddress: '0x2222222222222222222222222222222222222222',
        originalIndex: 1
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
    
    console.log('🔍 Testing each circuit component separately...');
    
    // 1. Test Poseidon hash verification
    console.log('1️⃣ Testing Poseidon hash verification...');
    const poseidonInputs = [];
    for (let i = 0; i < 8; i++) {
      const price = BigInt(circuitInputs.bidPrices[i]);
      const amount = BigInt(circuitInputs.bidAmounts[i]);
      const bidder = BigInt(circuitInputs.bidderAddresses[i]);
      const contract = BigInt(circuitInputs.commitmentContractAddress);
      
      // Expected: Poseidon(price, amount, bidder, contract) === commitment
      const expectedCommitment = BigInt(circuitInputs.commitments[i]);
      
      poseidonInputs.push({
        index: i,
        price,
        amount,
        bidder,
        contract,
        expectedCommitment,
        actualCommitment: expectedCommitment // We'll calculate this separately
      });
    }
    
    // 2. Test sorting verification
    console.log('2️⃣ Testing sorting verification...');
    const sortingIssues = [];
    for (let i = 0; i < 7; i++) {
      const currentPrice = BigInt(circuitInputs.sortedPrices[i]);
      const nextPrice = BigInt(circuitInputs.sortedPrices[i + 1]);
      
      // Should be descending: currentPrice >= nextPrice
      if (currentPrice < nextPrice && nextPrice > 0n) {
        sortingIssues.push({
          index: i,
          currentPrice,
          nextPrice
        });
      }
    }
    
    // 3. Test field element bounds
    console.log('3️⃣ Testing field element bounds...');
    const BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    const fieldElementIssues = [];
    
    const allValues = [
      ...circuitInputs.bidPrices,
      ...circuitInputs.bidAmounts,
      ...circuitInputs.bidderAddresses,
      ...circuitInputs.commitments,
      circuitInputs.commitmentContractAddress,
      circuitInputs.makerMinimumPrice,
      circuitInputs.makerMaximumAmount,
      ...circuitInputs.sortedPrices,
      ...circuitInputs.sortedAmounts,
      ...circuitInputs.sortedIndices,
      ...circuitInputs.winnerBits
    ];
    
    for (let i = 0; i < allValues.length; i++) {
      const value = BigInt(allValues[i]);
      if (value >= BN254_PRIME || value < 0n) {
        fieldElementIssues.push({
          index: i,
          value,
          prime: BN254_PRIME
        });
      }
    }
    
    // 4. Test constraint arithmetic
    console.log('4️⃣ Testing constraint arithmetic...');
    const arithmeticIssues = [];
    
    // Test the cumulative fill calculation
    let cumulativeFill = 0n;
    for (let i = 0; i < 8; i++) {
      const amount = BigInt(circuitInputs.sortedAmounts[i]);
      const isWinner = parseInt(circuitInputs.winnerBits[i]);
      
      if (isWinner) {
        const newCumulative = cumulativeFill + amount;
        if (newCumulative >= BN254_PRIME) {
          arithmeticIssues.push({
            type: 'cumulative_overflow',
            index: i,
            cumulativeFill,
            amount,
            newCumulative
          });
        }
        cumulativeFill = newCumulative;
      }
    }
    
    // Report findings
    console.log('📊 Constraint Analysis Results:');
    console.log(`  - Poseidon inputs: ${poseidonInputs.length} (need manual verification)`);
    console.log(`  - Sorting issues: ${sortingIssues.length}`);
    console.log(`  - Field element issues: ${fieldElementIssues.length}`);
    console.log(`  - Arithmetic issues: ${arithmeticIssues.length}`);
    
    if (sortingIssues.length > 0) {
      console.log('❌ Sorting issues found:');
      sortingIssues.forEach(issue => {
        console.log(`  Index ${issue.index}: ${issue.currentPrice} < ${issue.nextPrice}`);
      });
    }
    
    if (fieldElementIssues.length > 0) {
      console.log('❌ Field element issues found:');
      fieldElementIssues.forEach(issue => {
        console.log(`  Index ${issue.index}: ${issue.value} >= ${issue.prime}`);
      });
    }
    
    if (arithmeticIssues.length > 0) {
      console.log('❌ Arithmetic issues found:');
      arithmeticIssues.forEach(issue => {
        console.log(`  ${issue.type}: ${issue.cumulativeFill} + ${issue.amount} = ${issue.newCumulative}`);
      });
    }
    
    // The most likely culprit is Poseidon hash verification
    console.log('💡 Most likely issue: Poseidon hash verification');
    console.log('   The circuit expects: Poseidon(price, amount, bidder, contract) === commitment');
    console.log('   But our JavaScript might be using different input format or hash function');
    
    expect(sortingIssues.length).to.equal(0, 'No sorting issues');
    expect(fieldElementIssues.length).to.equal(0, 'No field element issues');
    expect(arithmeticIssues.length).to.equal(0, 'No arithmetic issues');
  });

  it('should verify Poseidon hash compatibility between JS and Circuit', async function() {
    console.log('🔍 Verifying Poseidon hash compatibility...');
    
    // Use the same test case
    const testBids: Bid[] = [
      { 
        price: 2000000000000000000n, 
        amount: 50000000000000000000n, 
        bidderAddress: '0x1111111111111111111111111111111111111111',
        originalIndex: 0
      },
      { 
        price: 1800000000000000000n, 
        amount: 30000000000000000000n, 
        bidderAddress: '0x2222222222222222222222222222222222222222',
        originalIndex: 1
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
    
    console.log('🔍 Testing Poseidon hash compatibility...');
    
    // Import the real Poseidon function
    const { realPoseidonHash } = await import('../circuits/utils/hash-utils');
    
    const hashMismatches = [];
    
    for (let i = 0; i < 8; i++) {
      const price = BigInt(circuitInputs.bidPrices[i]);
      const amount = BigInt(circuitInputs.bidAmounts[i]);
      const bidder = BigInt(circuitInputs.bidderAddresses[i]);
      const contract = BigInt(circuitInputs.commitmentContractAddress);
      const expectedCommitment = BigInt(circuitInputs.commitments[i]);
      
      // Calculate what the circuit expects: Poseidon(price, amount, bidder, contract)
      const circuitExpectedHash = await realPoseidonHash([price, amount, bidder, contract]);
      
      console.log(`  Bid ${i}:`);
      console.log(`    Price: ${price}`);
      console.log(`    Amount: ${amount}`);
      console.log(`    Bidder: ${bidder}`);
      console.log(`    Contract: ${contract}`);
      console.log(`    Expected commitment: ${expectedCommitment}`);
      console.log(`    Circuit hash: ${circuitExpectedHash}`);
      console.log(`    Match: ${expectedCommitment === circuitExpectedHash}`);
      
      if (expectedCommitment !== circuitExpectedHash) {
        hashMismatches.push({
          index: i,
          expected: expectedCommitment,
          actual: circuitExpectedHash,
          inputs: [price, amount, bidder, contract]
        });
      }
    }
    
    if (hashMismatches.length > 0) {
      console.log('❌ POSEIDON HASH MISMATCHES FOUND:');
      hashMismatches.forEach(mismatch => {
        console.log(`  Bid ${mismatch.index}:`);
        console.log(`    Expected: ${mismatch.expected}`);
        console.log(`    Actual: ${mismatch.actual}`);
        console.log(`    Inputs: [${mismatch.inputs.join(', ')}]`);
      });
      
      console.log('💡 ROOT CAUSE IDENTIFIED:');
      console.log('   The circuit expects: Poseidon(price, amount, bidder, contract)');
      console.log('   But our JavaScript generates different commitments');
      console.log('   This explains the Assert Failed at line 97!');
      
    } else {
      console.log('✅ All Poseidon hashes match!');
      console.log('💡 The issue must be elsewhere in the circuit...');
    }
    
    expect(hashMismatches.length).to.equal(0, 'All Poseidon hashes should match between JS and Circuit');
  });

  it('should verify exact constraint logic difference between JS and Circuit', async function() {
    console.log('🔍 Testing exact constraint logic difference...');
    
    // Use a test case where the constraint difference might matter
    const testBids: Bid[] = [
      { 
        price: 2000000000000000000n, 
        amount: 100000000000000000000n, // Exactly equal to max amount
        bidderAddress: '0x1111111111111111111111111111111111111111',
        originalIndex: 0
      }
    ];
    
    const constraints: AuctionConstraints = {
      makerMinimumPrice: 1500000000000000000n,
      makerMaximumAmount: 100000000000000000000n, // Exactly equal to bid amount
      commitmentContractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
    };
    
    // JavaScript logic
    const jsResult = simulateAuction(testBids, constraints);
    console.log('📊 JavaScript result:');
    console.log(`  Winners: ${jsResult.numWinners}`);
    console.log(`  Total fill: ${jsResult.totalFill}`);
    console.log(`  Winner bitmask: ${jsResult.winnerBitmask}`);
    
    // Circuit logic simulation
    const bidAmount = 100000000000000000000n;
    const maxAmount = 100000000000000000000n;
    
    // JavaScript: (totalFill + bid.amount) <= maxAmount
    const jsFitsQuantity = (0n + bidAmount) <= maxAmount;
    console.log(`  JavaScript fitsQuantity: ${0n} + ${bidAmount} <= ${maxAmount} = ${jsFitsQuantity}`);
    
    // Circuit: (cumulativeFill + amount) < (maxAmount + 1)
    const circuitFitsQuantity = (0n + bidAmount) < (maxAmount + 1n);
    console.log(`  Circuit fitsQuantity: ${0n} + ${bidAmount} < ${maxAmount + 1n} = ${circuitFitsQuantity}`);
    
    // Price constraint
    const bidPrice = 2000000000000000000n;
    const minPrice = 1500000000000000000n;
    
    const jsMeetsPrice = bidPrice >= minPrice;
    const circuitMeetsPrice = bidPrice >= minPrice;
    
    console.log(`  JavaScript meetsPrice: ${bidPrice} >= ${minPrice} = ${jsMeetsPrice}`);
    console.log(`  Circuit meetsPrice: ${bidPrice} >= ${minPrice} = ${circuitMeetsPrice}`);
    
    // Final winner determination
    const jsWinner = jsFitsQuantity && jsMeetsPrice;
    const circuitWinner = circuitFitsQuantity && circuitMeetsPrice;
    
    console.log(`  JavaScript winner: ${jsFitsQuantity} && ${jsMeetsPrice} = ${jsWinner}`);
    console.log(`  Circuit winner: ${circuitFitsQuantity} && ${circuitMeetsPrice} = ${circuitWinner}`);
    
    console.log(`  Match: ${jsWinner === circuitWinner ? '✅' : '❌'}`);
    
    // Test with edge case: bid amount = max amount
    console.log('🔍 Edge case: bid amount exactly equals max amount');
    console.log(`  JavaScript: ${bidAmount} <= ${maxAmount} = ${bidAmount <= maxAmount}`);
    console.log(`  Circuit: ${bidAmount} < ${maxAmount + 1n} = ${bidAmount < (maxAmount + 1n)}`);
    
    expect(jsWinner).to.equal(circuitWinner, 'JavaScript and Circuit winner logic should match');
  });

  it('should isolate the exact failing constraint with minimal inputs', async function() {
    console.log('🔍 Testing with minimal inputs to isolate the failing constraint...');
    
    // Use the simplest possible test case - just one bid
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
    
    console.log('🔍 Analyzing minimal circuit inputs...');
    console.log('  Bid Prices:', circuitInputs.bidPrices);
    console.log('  Bid Amounts:', circuitInputs.bidAmounts);
    console.log('  Sorted Prices:', circuitInputs.sortedPrices);
    console.log('  Sorted Amounts:', circuitInputs.sortedAmounts);
    console.log('  Winner Bits:', circuitInputs.winnerBits);
    console.log('  Commitments:', circuitInputs.commitments);
    
    // Test each constraint individually
    console.log('🔍 Testing individual constraints...');
    
    // 1. Test sorting constraint
    console.log('1️⃣ Testing sorting constraint...');
    const sortedPrices = circuitInputs.sortedPrices.map((p: string) => BigInt(p));
    let sortingOK = true;
    for (let i = 0; i < 7; i++) {
      if (sortedPrices[i] < sortedPrices[i + 1] && sortedPrices[i + 1] > 0n) {
        console.log(`  ❌ Sorting violation at index ${i}: ${sortedPrices[i]} < ${sortedPrices[i + 1]}`);
        sortingOK = false;
      }
    }
    console.log(`  Sorting constraint: ${sortingOK ? '✅ OK' : '❌ FAILED'}`);
    
    // 2. Test winner calculation
    console.log('2️⃣ Testing winner calculation...');
    const winnerBits = circuitInputs.winnerBits.map((bit: string) => parseInt(bit));
    const minPrice = BigInt(circuitInputs.makerMinimumPrice);
    const maxAmount = BigInt(circuitInputs.makerMaximumAmount);
    
    let cumulativeFill = 0n;
    let winnerCalculationOK = true;
    
    for (let i = 0; i < 8; i++) {
      const price = sortedPrices[i];
      const amount = BigInt(circuitInputs.sortedAmounts[i]);
      
      const canFit = (cumulativeFill + amount) < maxAmount;
      const priceOK = price >= minPrice;
      const circuitIsWinner = canFit && priceOK;
      const jsWinnerBit = winnerBits[i];
      
      if ((jsWinnerBit === 1) !== circuitIsWinner) {
        console.log(`  ❌ Winner mismatch at index ${i}: JS=${jsWinnerBit}, Circuit=${circuitIsWinner}`);
        console.log(`    Price: ${price}, Amount: ${amount}, CanFit: ${canFit}, PriceOK: ${priceOK}`);
        winnerCalculationOK = false;
      }
      
      if (circuitIsWinner) {
        cumulativeFill += amount;
      }
    }
    console.log(`  Winner calculation: ${winnerCalculationOK ? '✅ OK' : '❌ FAILED'}`);
    
    // 3. Test field element bounds
    console.log('3️⃣ Testing field element bounds...');
    const BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    let fieldElementOK = true;
    
    const allValues = [
      ...circuitInputs.bidPrices,
      ...circuitInputs.bidAmounts,
      ...circuitInputs.bidderAddresses,
      ...circuitInputs.commitments,
      circuitInputs.commitmentContractAddress,
      circuitInputs.makerMinimumPrice,
      circuitInputs.makerMaximumAmount,
      ...circuitInputs.sortedPrices,
      ...circuitInputs.sortedAmounts,
      ...circuitInputs.sortedIndices,
      ...circuitInputs.winnerBits
    ];
    
    for (let i = 0; i < allValues.length; i++) {
      const value = BigInt(allValues[i]);
      if (value >= BN254_PRIME || value < 0n) {
        console.log(`  ❌ Field element violation at index ${i}: ${value}`);
        fieldElementOK = false;
      }
    }
    console.log(`  Field element bounds: ${fieldElementOK ? '✅ OK' : '❌ FAILED'}`);
    
    // 4. Test Poseidon hash verification
    console.log('4️⃣ Testing Poseidon hash verification...');
    const { realPoseidonHash } = await import('../circuits/utils/hash-utils');
    let poseidonOK = true;
    
    for (let i = 0; i < 8; i++) {
      const price = BigInt(circuitInputs.bidPrices[i]);
      const amount = BigInt(circuitInputs.bidAmounts[i]);
      const bidder = BigInt(circuitInputs.bidderAddresses[i]);
      const contract = BigInt(circuitInputs.commitmentContractAddress);
      const expectedCommitment = BigInt(circuitInputs.commitments[i]);
      
      const circuitHash = await realPoseidonHash([price, amount, bidder, contract]);
      
      if (expectedCommitment !== circuitHash) {
        console.log(`  ❌ Poseidon mismatch at index ${i}: Expected=${expectedCommitment}, Actual=${circuitHash}`);
        poseidonOK = false;
      }
    }
    console.log(`  Poseidon hash verification: ${poseidonOK ? '✅ OK' : '❌ FAILED'}`);
    
    // Summary
    console.log('📊 Constraint Analysis Summary:');
    console.log(`  - Sorting: ${sortingOK ? '✅' : '❌'}`);
    console.log(`  - Winner calculation: ${winnerCalculationOK ? '✅' : '❌'}`);
    console.log(`  - Field elements: ${fieldElementOK ? '✅' : '❌'}`);
    console.log(`  - Poseidon hashes: ${poseidonOK ? '✅' : '❌'}`);
    
    if (sortingOK && winnerCalculationOK && fieldElementOK && poseidonOK) {
      console.log('💡 All constraints appear valid - the issue might be in circuit implementation');
    } else {
      console.log('💡 Found constraint violations - these explain the Assert Failed');
    }
    
    expect(sortingOK && winnerCalculationOK && fieldElementOK && poseidonOK).to.be.true;
  });
}); 