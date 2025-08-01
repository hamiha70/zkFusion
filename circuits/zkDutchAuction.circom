// Version 2.0 - Final for Hackathon
pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/gates.circom";

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
    
    // Winner bits verification (same permutation pattern)
    signal input sortedWinnerBits[N];    // Winner bits in sorted order (private)
    signal input originalWinnerBits[N];  // Winner bits in original order (public)
    
    // Verify sorting: each element >= next element (descending order for Dutch auction)
    component geq[N-1];
    for (var i = 0; i < N-1; i++) {
        geq[i] = GreaterEqThan(252); // Maximum supported by circomlib
        geq[i].in[0] <== sortedPrices[i];
        geq[i].in[1] <== sortedPrices[i+1];
        geq[i].out === 1; // Must be true for valid sorting
    }
    
    // Verify permutation correctness - declare all signals/components at template level
    signal priceSum[N][N+1];      // [position][accumulator_step]
    signal amountSum[N][N+1];     // [position][accumulator_step]
    signal winnerBitSum[N][N+1];  // [position][accumulator_step] - for winner bits
    component eq[N][N];           // [position][comparison_index]
    
    for (var i = 0; i < N; i++) {
        priceSum[i][0] <== 0;
        amountSum[i][0] <== 0;
        winnerBitSum[i][0] <== 0;  // Initialize winner bit accumulator
        
        for (var j = 0; j < N; j++) {
            eq[i][j] = IsEqual();
            eq[i][j].in[0] <== sortedIndices[i];
            eq[i][j].in[1] <== j;
            
            // Use selector to pick the right original value
            priceSum[i][j+1] <== priceSum[i][j] + eq[i][j].out * originalPrices[j];
            amountSum[i][j+1] <== amountSum[i][j] + eq[i][j].out * originalAmounts[j];
            winnerBitSum[i][j+1] <== winnerBitSum[i][j] + eq[i][j].out * originalWinnerBits[j];
        }
        
        // The selected value should equal the sorted value
        sortedPrices[i] === priceSum[i][N];
        sortedAmounts[i] === amountSum[i][N];
        sortedWinnerBits[i] === winnerBitSum[i][N];  // Verify winner bits permutation
    }
}

// Main Dutch auction circuit template
template zkDutchAuction(N) {
    // Private inputs (revealed bids)
    signal input bidPrices[N];
    signal input bidAmounts[N];
    signal input bidderAddresses[N];  // Changed from string to field element representation
    
    // Private inputs (sorting verification)
    signal input sortedPrices[N];       // Bids sorted by price (descending)
    signal input sortedAmounts[N];      // Corresponding amounts
    signal input sortedIndices[N];      // Mapping from sorted position to original position
    signal input sortedWinnerBits[N];   // Winner bits in sorted order (private)
    
    // Public inputs (from commitment contract)
    signal input commitments[N];              // Poseidon hashes of (price, amount, bidderAddress, contractAddress)
    signal input commitmentContractAddress;   // Address of the commitment contract
    signal input makerMinimumPrice;           // Minimum acceptable price per token
    signal input makerMaximumAmount;          // Maximum tokens to sell
    signal input originalWinnerBits[N];       // Winner bits in original order (public)
    
    // Outputs
    signal output totalFill;           // Total amount of tokens sold
    signal output totalValue;    // Formerly weightedAvgPrice. Sum of (price * amount) for winners.
    signal output numWinners;          // Number of winning bids
    
    // 1. Verify commitments using 4-input Poseidon hash
    component hasher[N];
    for (var i = 0; i < N; i++) {
        hasher[i] = Poseidon(4);
        hasher[i].inputs[0] <== bidPrices[i];
        hasher[i].inputs[1] <== bidAmounts[i];
        hasher[i].inputs[2] <== bidderAddresses[i];
        hasher[i].inputs[3] <== commitmentContractAddress;
        hasher[i].out === commitments[i];
    }
    
    // 2. Verify sorting using the SortingVerifier subcircuit
    component sortingVerifier = SortingVerifier(N);
    sortingVerifier.sortedPrices <== sortedPrices;
    sortingVerifier.sortedAmounts <== sortedAmounts;
    sortingVerifier.sortedIndices <== sortedIndices;
    sortingVerifier.originalPrices <== bidPrices;
    sortingVerifier.originalAmounts <== bidAmounts;
    sortingVerifier.sortedWinnerBits <== sortedWinnerBits;
    sortingVerifier.originalWinnerBits <== originalWinnerBits;
    
    // 3. Calculate auction results using sorted bids with dual constraints
    signal cumulativeFill[N+1];
    signal cumulativeValue[N+1];
    signal isWinner[N];
    
    cumulativeFill[0] <== 0;
    cumulativeValue[0] <== 0;
    
    component canFit[N];      // Quantity constraint check
    component priceOK[N];     // Price constraint check
    component nonZero[N];     // Non-zero amount constraint check
    signal bidValue[N];       // Intermediate signal to avoid triple multiplication
    signal constraint1[N];    // Intermediate: canFit[i].out * priceOK[i].out
    
    for (var i = 0; i < N; i++) {
        // Check if this bid fits within remaining token capacity
        canFit[i] = LessThan(252);  // Maximum supported by circomlib
        canFit[i].in[0] <== cumulativeFill[i] + sortedAmounts[i];
        canFit[i].in[1] <== makerMaximumAmount + 1;  // LessThan(a, b+1) implements a ≤ b
        
        // Check if price meets minimum requirement per token
        priceOK[i] = GreaterEqThan(252);  // Maximum supported by circomlib
        priceOK[i].in[0] <== sortedPrices[i];
        priceOK[i].in[1] <== makerMinimumPrice;
        
        // Check if amount is non-zero (prevent zero-amount bids from being winners)
        nonZero[i] = GreaterThan(252);
        nonZero[i].in[0] <== sortedAmounts[i];
        nonZero[i].in[1] <== 0;
        
        // Winner if ALL constraints satisfied: fits capacity AND meets price AND non-zero amount
        // Break down triple multiplication into quadratic steps
        constraint1[i] <== canFit[i].out * priceOK[i].out;           // First multiplication
        isWinner[i] <== constraint1[i] * nonZero[i].out;             // Second multiplication
        
        // Calculate bid value for cumulative value calculation
        bidValue[i] <== sortedPrices[i] * sortedAmounts[i];          // Price * Amount multiplication
        
        // Update cumulative values
        cumulativeFill[i+1] <== cumulativeFill[i] + isWinner[i] * sortedAmounts[i];
        cumulativeValue[i+1] <== cumulativeValue[i] + isWinner[i] * bidValue[i]; // Second multiplication
    }
    
    // 4. Calculate final outputs
    totalFill <== cumulativeFill[N];
    
    // Output total value instead of weighted average (avoid division in circuit)
    // Contract will calculate weightedAvgPrice = totalValue / totalFill
    totalValue <== cumulativeValue[N];
    
    // 5. Count winners and validate winner bits
    signal winnerCount[N+1];
    winnerCount[0] <== 0;
    
    // Winner validation components
    component bitValidator[N];
    
    for (var i = 0; i < N; i++) {
        // Count winners
        winnerCount[i+1] <== winnerCount[i] + isWinner[i];
        
        // Validate that sortedWinnerBits[i] matches isWinner[i] (both in sorted order)
        bitValidator[i] = IsEqual();
        bitValidator[i].in[0] <== sortedWinnerBits[i];
        bitValidator[i].in[1] <== isWinner[i];
        bitValidator[i].out === 1; // Bit i must equal isWinner[i]
    }
    
    numWinners <== winnerCount[N];
}

// Template exported for use by wrapper circuits
// Main component is instantiated in zkDutchAuction8.circom 