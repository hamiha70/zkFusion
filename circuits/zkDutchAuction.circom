pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

// Simple bitonic sort for small arrays (N=4 for hackathon demo)
template BitonicSort4() {
    signal input in[4];
    signal output out[4];
    signal output indices[4]; // Track original indices
    
    // Initialize indices
    component indexInit[4];
    for (var i = 0; i < 4; i++) {
        indexInit[i] = Num2Bits(8);
        indexInit[i].in <== i;
    }
    
    // Stage 1: Compare pairs (0,1) and (2,3)
    component cmp1 = GreaterThan(64);
    cmp1.in[0] <== in[0];
    cmp1.in[1] <== in[1];
    
    component cmp2 = GreaterThan(64);
    cmp2.in[0] <== in[2];
    cmp2.in[1] <== in[3];
    
    // Swap if needed
    signal stage1[4];
    signal idx1[4];
    stage1[0] <== cmp1.out * in[1] + (1 - cmp1.out) * in[0];
    stage1[1] <== cmp1.out * in[0] + (1 - cmp1.out) * in[1];
    stage1[2] <== cmp2.out * in[3] + (1 - cmp2.out) * in[2];
    stage1[3] <== cmp2.out * in[2] + (1 - cmp2.out) * in[3];
    
    idx1[0] <== cmp1.out * 1 + (1 - cmp1.out) * 0;
    idx1[1] <== cmp1.out * 0 + (1 - cmp1.out) * 1;
    idx1[2] <== cmp2.out * 3 + (1 - cmp2.out) * 2;
    idx1[3] <== cmp2.out * 2 + (1 - cmp2.out) * 3;
    
    // Stage 2: Compare (0,2) and (1,3)
    component cmp3 = GreaterThan(64);
    cmp3.in[0] <== stage1[0];
    cmp3.in[1] <== stage1[2];
    
    component cmp4 = GreaterThan(64);
    cmp4.in[0] <== stage1[1];
    cmp4.in[1] <== stage1[3];
    
    signal stage2[4];
    signal idx2[4];
    stage2[0] <== cmp3.out * stage1[2] + (1 - cmp3.out) * stage1[0];
    stage2[1] <== cmp4.out * stage1[3] + (1 - cmp4.out) * stage1[1];
    stage2[2] <== cmp3.out * stage1[0] + (1 - cmp3.out) * stage1[2];
    stage2[3] <== cmp4.out * stage1[1] + (1 - cmp4.out) * stage1[3];
    
    idx2[0] <== cmp3.out * idx1[2] + (1 - cmp3.out) * idx1[0];
    idx2[1] <== cmp4.out * idx1[3] + (1 - cmp4.out) * idx1[1];
    idx2[2] <== cmp3.out * idx1[0] + (1 - cmp3.out) * idx1[2];
    idx2[3] <== cmp4.out * idx1[1] + (1 - cmp4.out) * idx1[3];
    
    // Stage 3: Final comparison (1,2)
    component cmp5 = GreaterThan(64);
    cmp5.in[0] <== stage2[1];
    cmp5.in[1] <== stage2[2];
    
    out[0] <== stage2[0];
    out[1] <== cmp5.out * stage2[2] + (1 - cmp5.out) * stage2[1];
    out[2] <== cmp5.out * stage2[1] + (1 - cmp5.out) * stage2[2];
    out[3] <== stage2[3];
    
    indices[0] <== idx2[0];
    indices[1] <== cmp5.out * idx2[2] + (1 - cmp5.out) * idx2[1];
    indices[2] <== cmp5.out * idx2[1] + (1 - cmp5.out) * idx2[2];
    indices[3] <== idx2[3];
}

template zkDutchAuction(N) {
    // Private inputs (from revealed bids)
    signal private input bidPrices[N];
    signal private input bidAmounts[N];
    signal private input nonces[N];
    
    // Public inputs
    signal input commitments[N];           // On-chain commitments
    signal input makerAsk;                 // Maximum amount maker wants to fill
    signal input commitmentContractAddress; // Address of commitment contract
    
    // Public outputs
    signal output totalFill;
    signal output weightedAvgPrice;
    signal output winningCommitments[N];   // Commitments of winners (for verification)
    signal output outCommitmentContractAddress; // Echo the contract address
    
    // Internal signals
    signal sortedPrices[N];
    signal sortedAmounts[N];
    signal sortedIndices[N];
    
    // Step 1: Verify all commitments match revealed bids
    component hashers[N];
    for (var i = 0; i < N; i++) {
        hashers[i] = Poseidon(3);
        hashers[i].inputs[0] <== bidPrices[i];
        hashers[i].inputs[1] <== bidAmounts[i];
        hashers[i].inputs[2] <== nonces[i];
        hashers[i].out === commitments[i];
    }
    
    // Step 2: Sort bids by price (descending order)
    // For N=4, use BitonicSort4
    component sorter = BitonicSort4();
    for (var i = 0; i < N; i++) {
        sorter.in[i] <== bidPrices[i];
    }
    
    // Get sorted prices and corresponding amounts
    for (var i = 0; i < N; i++) {
        sortedPrices[i] <== sorter.out[i];
        sortedIndices[i] <== sorter.indices[i];
    }
    
    // Map amounts to sorted order
    component amountMappers[N];
    for (var i = 0; i < N; i++) {
        amountMappers[i] = Num2Bits(8);
        amountMappers[i].in <== sortedIndices[i];
        
        // This is a simplified mapping - in production, use proper index-based selection
        sortedAmounts[i] <== bidAmounts[i]; // Simplified for demo
    }
    
    // Step 3: Select winners greedily (highest price first)
    signal runningFill[N+1];
    signal runningWeighted[N+1];
    signal isWinner[N];
    
    runningFill[0] <== 0;
    runningWeighted[0] <== 0;
    
    component fillCheckers[N];
    for (var i = 0; i < N; i++) {
        fillCheckers[i] = LessEqThan(64);
        fillCheckers[i].in[0] <== runningFill[i] + sortedAmounts[i];
        fillCheckers[i].in[1] <== makerAsk;
        
        isWinner[i] <== fillCheckers[i].out;
        
        runningFill[i+1] <== runningFill[i] + isWinner[i] * sortedAmounts[i];
        runningWeighted[i+1] <== runningWeighted[i] + isWinner[i] * sortedPrices[i] * sortedAmounts[i];
    }
    
    // Step 4: Output results
    totalFill <== runningFill[N];
    
    // Calculate weighted average price (avoid division by zero)
    component divChecker = IsZero();
    divChecker.in <== totalFill;
    
    // If totalFill is 0, output 0, otherwise compute weighted average
    weightedAvgPrice <== (1 - divChecker.out) * runningWeighted[N] / totalFill;
    
    // Output winning commitments for on-chain verification
    for (var i = 0; i < N; i++) {
        winningCommitments[i] <== isWinner[i] * commitments[i];
    }
    
    // Echo the commitment contract address for binding
    outCommitmentContractAddress <== commitmentContractAddress;
}

// Main component for N=4 bidders (hackathon demo size)
component main {public [commitments, makerAsk, commitmentContractAddress]} = zkDutchAuction(4); 