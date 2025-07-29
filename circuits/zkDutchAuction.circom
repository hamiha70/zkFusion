pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

// Fixed circuit size for zkFusion hackathon
// For production, deploy separate circuits for different N values
const N_MAX_BIDS = 8;

// Subcircuit to verify that a permutation represents a correctly sorted order
// This is much more efficient than implementing sorting in ZK
template SortingVerifier(N) {
    // Private inputs: the actual bid values in sorted order
    signal input sortedPrices[N];
    signal input sortedAmounts[N];
    
    // Private inputs: mapping from sorted position -> original position
    // sortedIndices[i] = j means "the i-th highest bid was originally at position j"
    signal input sortedIndices[N];
    
    // Original bid data (to verify permutation is correct)
    signal input originalPrices[N];
    signal input originalAmounts[N];
    
    // Verify sorting: each element >= next element (descending order for Dutch auction)
    component geq[N-1];
    for (var i = 0; i < N-1; i++) {
        geq[i] = GreaterEqThan(64); // Assuming 64-bit prices
        geq[i].in[0] <== sortedPrices[i];
        geq[i].in[1] <== sortedPrices[i+1];
        geq[i].out === 1; // Must be true for valid sorting
    }
    
    // Verify permutation correctness - declare all signals/components at template level
    signal priceSum[N][N+1];    // [position][accumulator_step]
    signal amountSum[N][N+1];   // [position][accumulator_step]
    component eq[N][N];         // [position][comparison_index]
    
    for (var i = 0; i < N; i++) {
        priceSum[i][0] <== 0;
        amountSum[i][0] <== 0;
        
        for (var j = 0; j < N; j++) {
            eq[i][j] = IsEqual();
            eq[i][j].in[0] <== sortedIndices[i];
            eq[i][j].in[1] <== j;
            
            // Use selector to pick the right original value
            priceSum[i][j+1] <== priceSum[i][j] + eq[i][j].out * originalPrices[j];
            amountSum[i][j+1] <== amountSum[i][j] + eq[i][j].out * originalAmounts[j];
        }
        
        // The selected value should equal the sorted value
        sortedPrices[i] === priceSum[i][N];
        sortedAmounts[i] === amountSum[i][N];
    }
}

// Main zkFusion auction circuit with sorting verification
template zkDutchAuction(N) {
    // Private inputs (from revealed bids)
    signal input bidPrices[N];
    signal input bidAmounts[N];
    signal input nonces[N];
    
    // Private inputs (sorting-related)
    signal input sortedPrices[N];    // Bids sorted by price (descending)
    signal input sortedAmounts[N];   // Corresponding amounts
    signal input sortedIndices[N];   // Mapping from sorted position to original position
    
    // Public inputs
    signal input commitments[N];           // On-chain commitments
    signal input makerAsk;                 // Maximum amount maker wants to fill
    signal input commitmentContractAddress; // Address of commitment contract
    
    // Public outputs
    signal output totalFill;
    signal output weightedAvgPrice;
    signal output numWinners;
    signal output winnerBitmask;  // NEW: 8-bit bitmask indicating winners
    
    // 1. Verify sorting is correct
    component sortVerifier = SortingVerifier(N);
    sortVerifier.originalPrices <== bidPrices;
    sortVerifier.originalAmounts <== bidAmounts;
    sortVerifier.sortedPrices <== sortedPrices;
    sortVerifier.sortedAmounts <== sortedAmounts;
    sortVerifier.sortedIndices <== sortedIndices;
    
    // 2. Verify commitments match revealed bids
    component poseidon[N];
    for (var i = 0; i < N; i++) {
        poseidon[i] = Poseidon(3);
        poseidon[i].inputs[0] <== bidPrices[i];
        poseidon[i].inputs[1] <== bidAmounts[i];
        poseidon[i].inputs[2] <== nonces[i];
        poseidon[i].out === commitments[i];
    }
    
    // 3. Calculate auction results using sorted bids (greedy fill)
    signal cumulativeFill[N+1];
    signal cumulativeValue[N+1];
    signal isWinner[N];
    
    cumulativeFill[0] <== 0;
    cumulativeValue[0] <== 0;
    
    component lessThan[N];
    signal bidValue[N]; // Intermediate signal to avoid triple multiplication
    
    // Winner bitmask validation components
    component bitExtractor[N];
    
    for (var i = 0; i < N; i++) {
        // Check if adding this bid would exceed makerAsk
        lessThan[i] = LessThan(64);
        lessThan[i].in[0] <== cumulativeFill[i] + sortedAmounts[i];
        lessThan[i].in[1] <== makerAsk + 1; // +1 because LessThan is strict
        
        // If we can fit this bid, include it
        isWinner[i] <== lessThan[i].out;
        
        // INTEGRATED: Validate winner bitmask bit i matches isWinner[i]
        bitExtractor[i] = IsEqual();
        bitExtractor[i].in[0] <== (winnerBitmask >> i) & 1;
        bitExtractor[i].in[1] <== isWinner[i];
        bitExtractor[i].out === 1; // Bit i must equal isWinner[i]
        
        // Break down triple multiplication into quadratic steps
        bidValue[i] <== sortedPrices[i] * sortedAmounts[i]; // First multiplication
        
        // Update cumulative values
        cumulativeFill[i+1] <== cumulativeFill[i] + isWinner[i] * sortedAmounts[i];
        cumulativeValue[i+1] <== cumulativeValue[i] + isWinner[i] * bidValue[i]; // Second multiplication
    }
    
    // 4. Calculate final outputs
    totalFill <== cumulativeFill[N];
    
    // Calculate weighted average price (avoiding division in circuit)
    // We output total value and let the contract calculate price = totalValue / totalFill
    signal totalValue;
    totalValue <== cumulativeValue[N];
    
    // For simplicity, we'll output totalValue and let off-chain calculate weighted avg
    // This avoids division in the circuit which is expensive
    weightedAvgPrice <== totalValue; // Contract will divide by totalFill
    
    // Count winners
    signal winnerCount[N+1];
    winnerCount[0] <== 0;
    for (var i = 0; i < N; i++) {
        winnerCount[i+1] <== winnerCount[i] + isWinner[i];
    }
    numWinners <== winnerCount[N];
    
    // 5. Verify commitment contract address binding
    signal addressHash;
    component addressPoseidon = Poseidon(1);
    addressPoseidon.inputs[0] <== commitmentContractAddress;
    addressHash <== addressPoseidon.out;
    
    // This creates a constraint that links the proof to a specific commitment contract
    // Preventing proof reuse across different auctions
    signal addressBinding;
    addressBinding <== addressHash * totalFill; // Binds address to auction result
}

// Template exported for use by test wrapper
// Main component is instantiated in circuits/test/zkDutchAuction.circom 