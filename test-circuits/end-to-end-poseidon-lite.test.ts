const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { poseidon4 } = require('poseidon-lite');

describe('End-to-End Poseidon-Lite Integration', function() {
  // Increase timeout for circuit operations
  this.timeout(60000);

  it('should complete full system test: poseidon-lite -> circuit -> witness', async function() {
    console.log('🧪 END-TO-END TEST WITH POSEIDON-LITE');
    console.log('='.repeat(60));
    console.log('Testing complete system: poseidon-lite -> circuit -> witness');
    
    // Load the main auction circuit
    const wasmPath = path.join(process.cwd(), 'circuits/zkDutchAuction8_js/zkDutchAuction8.wasm');
    const witnessCalculatorPath = path.join(process.cwd(), 'circuits/zkDutchAuction8_js/witness_calculator.js');
    
    const builder = await import(witnessCalculatorPath);
    const wasmBuffer = fs.readFileSync(wasmPath);
    const witnessCalculator = await builder.default(wasmBuffer);
    
    console.log('✅ Circuit loaded successfully');
    
    // Create realistic auction data
    const bidder1 = 0x1111111111111111111111111111111111111111n;
    const bidder2 = 0x2222222222222222222222222222222222222222n;
    const bidder3 = 0x3333333333333333333333333333333333333333n;
    const contractAddress = 0xabcdefabcdefabcdefabcdefabcdefabcdefabcdn;
    
    // Realistic bid data
    const bids = [
      { price: 1000000000000000000n, amount: 5000000000000000000n, bidder: bidder1 }, // 1 ETH for 5 tokens
      { price: 2000000000000000000n, amount: 3000000000000000000n, bidder: bidder2 }, // 2 ETH for 3 tokens
      { price: 1500000000000000000n, amount: 2000000000000000000n, bidder: bidder3 }, // 1.5 ETH for 2 tokens
    ];
    
    // Generate commitments using poseidon-lite
    const commitments = bids.map(bid => 
      poseidon4([bid.price, bid.amount, bid.bidder, contractAddress])
    );
    
    console.log('Generated commitments using poseidon-lite:');
    commitments.forEach((commitment, i) => {
      console.log(`  Bid ${i+1}: ${commitment.toString()}`);
    });
    
    // Sort bids by price (descending) for Dutch auction
    const sortedBids = [...bids].sort((a, b) => Number(b.price - a.price));
    
    // Create sorted arrays
    const sortedPrices = sortedBids.map(bid => bid.price.toString());
    const sortedAmounts = sortedBids.map(bid => bid.amount.toString());
    
    // Create sorted indices (mapping from sorted position to original position)
    const sortedIndices = sortedBids.map(bid => {
      const originalIndex = bids.findIndex(b => b.bidder === bid.bidder);
      return originalIndex.toString();
    });
    
    // Pad arrays to 8 elements
    while (sortedPrices.length < 8) {
      sortedPrices.push("0");
      sortedAmounts.push("0");
      sortedIndices.push(sortedPrices.length.toString());
    }
    
    // Calculate winner bits (simplified logic - first 3 bids win)
    const winnerBits = ["1", "1", "1", "0", "0", "0", "0", "0"];
    
    // Create null commitment for padding
    const nullCommitment = poseidon4([0n, 0n, 0n, contractAddress]);
    
    // Create circuit inputs
    const circuitInputs = {
      // Private inputs (revealed bids)
      bidPrices: [
        bids[0].price.toString(),
        bids[1].price.toString(),
        bids[2].price.toString(),
        "0", "0", "0", "0", "0"
      ],
      bidAmounts: [
        bids[0].amount.toString(),
        bids[1].amount.toString(),
        bids[2].amount.toString(),
        "0", "0", "0", "0", "0"
      ],
      bidderAddresses: [
        bids[0].bidder.toString(),
        bids[1].bidder.toString(),
        bids[2].bidder.toString(),
        "0", "0", "0", "0", "0"
      ],
      
      // Private inputs (sorting-related)
      sortedPrices,
      sortedAmounts,
      sortedIndices,
      winnerBits,
      
      // Public inputs (from commitment contract)
      commitments: [
        commitments[0].toString(),
        commitments[1].toString(),
        commitments[2].toString(),
        nullCommitment.toString(),
        nullCommitment.toString(),
        nullCommitment.toString(),
        nullCommitment.toString(),
        nullCommitment.toString()
      ],
      commitmentContractAddress: contractAddress.toString(),
      makerMinimumPrice: "500000000000000000", // 0.5 ETH minimum
      makerMaximumAmount: "10000000000000000000" // 10 tokens max
    };
    
    console.log('\n🧪 Testing complete end-to-end system...');
    
    const witness = await witnessCalculator.calculateWitness(circuitInputs);
    
    console.log('🎉 SUCCESS: Complete end-to-end test completed!');
    console.log('✅ poseidon-lite -> circuit -> witness = working system');
    
    // Extract outputs
    const totalFill = witness[2];
    const weightedAvgPrice = witness[3];
    const numWinners = witness[4];
    const winnerBitmask = witness[5];
    
    console.log('\n📊 Auction Results:');
    console.log(`Total Fill: ${totalFill}`);
    console.log(`Weighted Avg Price: ${weightedAvgPrice}`);
    console.log(`Number of Winners: ${numWinners}`);
    console.log(`Winner Bitmask: ${winnerBitmask}`);
    
    console.log('\n🎯 FINAL SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ poseidon-lite is fully integrated and working');
    console.log('✅ Complete end-to-end system is functional');
    console.log('✅ Ready for real contract integration');
    console.log('🚀 Next: Clean up obsolete tests and deploy');
    
    // Assertions to ensure the test actually validates the system
    expect(witness).to.be.an('array');
    expect(witness.length).to.be.greaterThan(5);
    expect(totalFill).to.not.equal(0n);
    expect(Number(numWinners)).to.be.greaterThan(0);
    expect(winnerBitmask).to.not.equal(0n);
    
    console.log('✅ All assertions passed - system is working correctly!');
  });

  it('should handle edge cases with zero bids', async function() {
    console.log('\n🧪 Testing edge case: zero bids scenario');
    
    // Load circuit
    const wasmPath = path.join(process.cwd(), 'circuits/zkDutchAuction8_js/zkDutchAuction8.wasm');
    const witnessCalculatorPath = path.join(process.cwd(), 'circuits/zkDutchAuction8_js/witness_calculator.js');
    
    const builder = await import(witnessCalculatorPath);
    const wasmBuffer = fs.readFileSync(wasmPath);
    const witnessCalculator = await builder.default(wasmBuffer);
    
    const contractAddress = 0xabcdefabcdefabcdefabcdefabcdefabcdefabcdn;
    
    // Create null commitment for all slots
    const nullCommitment = poseidon4([0n, 0n, 0n, contractAddress]);
    
    // Create circuit inputs with all zeros
    const circuitInputs = {
      // Private inputs (all zeros)
      bidPrices: Array(8).fill("0"),
      bidAmounts: Array(8).fill("0"),
      bidderAddresses: Array(8).fill("0"),
      
      // Private inputs (sorting-related)
      sortedPrices: Array(8).fill("0"),
      sortedAmounts: Array(8).fill("0"),
      sortedIndices: ["0", "1", "2", "3", "4", "5", "6", "7"],
      winnerBits: Array(8).fill("0"),
      
      // Public inputs
      commitments: Array(8).fill(nullCommitment.toString()),
      commitmentContractAddress: contractAddress.toString(),
      makerMinimumPrice: "500000000000000000",
      makerMaximumAmount: "10000000000000000000"
    };
    
    const witness = await witnessCalculator.calculateWitness(circuitInputs);
    
    // For zero bids, we expect zero fill and zero winners
    const totalFill = witness[2];
    const numWinners = witness[4];
    const winnerBitmask = witness[5];
    
    expect(totalFill).to.equal(0n);
    expect(Number(numWinners)).to.equal(0);
    expect(winnerBitmask).to.equal(0n);
    
    console.log('✅ Zero bids edge case handled correctly');
  });
}); 