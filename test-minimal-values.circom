pragma circom 2.0.0;

include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/poseidon.circom";

// Test with minimal values to isolate logic vs arithmetic issues
template MinimalValuesTest(N) {
    // Private inputs (minimal values)
    signal input bidPrices[N];
    signal input bidAmounts[N];
    signal input bidderAddresses[N];
    signal input sortedPrices[N];
    signal input sortedAmounts[N];
    signal input sortedIndices[N];
    signal input commitments[N];
    signal input commitmentContractAddress;
    
    // 1. SortingVerifier (same logic as main circuit)
    component eq[N][N];
    signal priceSum[N][N+1];
    signal amountSum[N][N+1];
    
    for (var i = 0; i < N; i++) {
        priceSum[i][0] <== 0;
        amountSum[i][0] <== 0;
        
        for (var j = 0; j < N; j++) {
            eq[i][j] = IsEqual();
            eq[i][j].in[0] <== sortedIndices[i];
            eq[i][j].in[1] <== j;
            
            // These accumulations use minimal values
            priceSum[i][j+1] <== priceSum[i][j] + eq[i][j].out * bidPrices[j];
            amountSum[i][j+1] <== amountSum[i][j] + eq[i][j].out * bidAmounts[j];
        }
        
        sortedPrices[i] === priceSum[i][N];
        sortedAmounts[i] === amountSum[i][N];
    }
    
    // 2. Poseidon verification (same logic as main circuit)
    component poseidon[N];
    for (var i = 0; i < N; i++) {
        poseidon[i] = Poseidon(4);
        poseidon[i].inputs[0] <== bidPrices[i];
        poseidon[i].inputs[1] <== bidAmounts[i];
        poseidon[i].inputs[2] <== bidderAddresses[i];
        poseidon[i].inputs[3] <== commitmentContractAddress;
        poseidon[i].out === commitments[i];
    }
}

component main = MinimalValuesTest(8); 