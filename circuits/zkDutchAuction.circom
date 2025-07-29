pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

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
        geq[i] = GreaterEqThan(128); // Increased from 64 to handle larger values
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

// Main zkFusion auction circuit with 4-input Poseidon hash and dual constraints
template zkDutchAuction(N) {
    // Private inputs (revealed bids)
    signal input bidPrices[N];
    signal input bidAmounts[N];
    signal input bidderAddresses[N];  // Bidder addresses for hash binding
    // Removed nonces - using commitmentContractAddress for uniqueness
    
    // Private inputs (sorting-related)
    signal input sortedPrices[N];    // Bids sorted by price (descending)
    signal input sortedAmounts[N];   // Corresponding amounts
    signal input sortedIndices[N];   // Mapping from sorted position to original position
    signal input winnerBits[N];      // Individual winner bits (0 or 1) instead of bitmask
    
    // Public inputs (from commitment contract)
    signal input commitments[N];              // Poseidon hashes (public)
    signal input commitmentContractAddress;  // Contract address (replay protection)
    signal input makerMinimumPrice;          // Minimum price per token
    signal input makerMaximumAmount;         // Maximum tokens to sell
    
    // Public outputs (aggregated for efficiency)
    signal output totalFill;
    signal output weightedAvgPrice;  // Actually total value - contract calculates price
    signal output numWinners;
    signal output winnerBitmask;     // Computed from winnerBits for output
    
    // 1. Verify sorting is correct
    component sortVerifier = SortingVerifier(N);
    sortVerifier.originalPrices <== bidPrices;
    sortVerifier.originalAmounts <== bidAmounts;
    sortVerifier.sortedPrices <== sortedPrices;
    sortVerifier.sortedAmounts <== sortedAmounts;
    sortVerifier.sortedIndices <== sortedIndices;
    
    // 2. Verify commitments match revealed bids using 4-input Poseidon (no nonce)
    component poseidon[N];
    for (var i = 0; i < N; i++) {
        poseidon[i] = Poseidon(4);  // UPDATED: 4 inputs instead of 5 (removed nonce)
        poseidon[i].inputs[0] <== bidPrices[i];
        poseidon[i].inputs[1] <== bidAmounts[i];
        poseidon[i].inputs[2] <== bidderAddresses[i];  // Address binding
        poseidon[i].inputs[3] <== commitmentContractAddress;  // Contract binding (was input 3, nonce removed)
        poseidon[i].out === commitments[i];
    }
    
    // 3. Calculate auction results using sorted bids with dual constraints
    signal cumulativeFill[N+1];
    signal cumulativeValue[N+1];
    signal isWinner[N];
    
    cumulativeFill[0] <== 0;
    cumulativeValue[0] <== 0;
    
    component canFit[N];      // Quantity constraint check
    component priceOK[N];     // Price constraint check
    signal bidValue[N];       // Intermediate signal to avoid triple multiplication
    
    for (var i = 0; i < N; i++) {
        // Check if this bid fits within remaining token capacity
        canFit[i] = LessThan(128);  // Increased from 64 to handle larger values
        canFit[i].in[0] <== cumulativeFill[i] + sortedAmounts[i];
        canFit[i].in[1] <== makerMaximumAmount + 1;  // +1 for strict less-than
        
        // Check if price meets minimum requirement per token
        priceOK[i] = GreaterEqThan(128);  // Increased from 64 to handle larger values
        priceOK[i].in[0] <== sortedPrices[i];
        priceOK[i].in[1] <== makerMinimumPrice;
        
        // Winner if BOTH constraints satisfied: fits capacity AND meets price
        isWinner[i] <== canFit[i].out * priceOK[i].out;
        
        // Break down triple multiplication into quadratic steps
        bidValue[i] <== sortedPrices[i] * sortedAmounts[i]; // First multiplication
        
        // Update cumulative values
        cumulativeFill[i+1] <== cumulativeFill[i] + isWinner[i] * sortedAmounts[i];
        cumulativeValue[i+1] <== cumulativeValue[i] + isWinner[i] * bidValue[i]; // Second multiplication
    }
    
    // 4. Calculate final outputs
    totalFill <== cumulativeFill[N];
    
    // Output total value instead of weighted average (avoid division in circuit)
    // Contract will calculate weightedAvgPrice = totalValue / totalFill
    weightedAvgPrice <== cumulativeValue[N];
    
    // 5. Count winners and validate bitmask
    signal winnerCount[N+1];
    signal bitmaskSum[N+1];  // Accumulate bitmask value
    winnerCount[0] <== 0;
    bitmaskSum[0] <== 0;
    
    // Bitmask validation components
    component bitValidator[N];
    
    for (var i = 0; i < N; i++) {
        // Count winners
        winnerCount[i+1] <== winnerCount[i] + isWinner[i];
        
        // Validate that winnerBits[i] matches isWinner[i]
        bitValidator[i] = IsEqual();
        bitValidator[i].in[0] <== winnerBits[i];
        bitValidator[i].in[1] <== isWinner[i];
        bitValidator[i].out === 1; // Bit i must equal isWinner[i]
        
        // Calculate bitmask: sum of winnerBits[i] * 2^i
        bitmaskSum[i+1] <== bitmaskSum[i] + winnerBits[i] * (2 ** i);
    }
    numWinners <== winnerCount[N];
    winnerBitmask <== bitmaskSum[N];
}

// Template exported for use by test wrapper
// Main component is instantiated in circuits/test/zkDutchAuction.circom 