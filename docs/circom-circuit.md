# zkDutchAuction Circuit Technical Documentation

## Overview

The zkDutchAuction circuit enables privacy-preserving Dutch auction execution where:
- Bidders commit to sealed bids using Poseidon hashes
- Maker proves knowledge of winning bids without revealing the permutation
- Circuit verifies auction logic and outputs results

## Circuit Architecture

### Input Signals

#### Private Inputs (Prover Knowledge)
```circom
signal input bidPrices[N];        // Original bid prices [600n, 1000n, 400n, 800n]
signal input bidAmounts[N];       // Original bid amounts [200n, 100n, 250n, 150n]  
signal input bidderAddresses[N];  // Bidder addresses as field elements

// Sorting verification
signal input sortedPrices[N];     // Sorted by price desc [1000n, 800n, 600n, 400n]
signal input sortedAmounts[N];    // Corresponding amounts [100n, 150n, 200n, 250n]
signal input sortedIndices[N];    // Permutation [1, 3, 0, 2] (sorted[i] = original[sortedIndices[i]])
signal input winnerBits[N];       // Winner flags in ORIGINAL order [1,1,0,1,0,0,0,0]
```

#### Public Inputs (Verifiable)
```circom
signal input commitments[N];              // Poseidon(price, amount, address, contractAddr)
signal input commitmentContractAddress;   // Binds proof to specific auction
signal input makerMinimumPrice;           // Minimum acceptable price per token  
signal input makerMaximumAmount;          // Maximum tokens to sell
```

### Output Signals
```circom
signal output totalFill;          // Total tokens sold
signal output weightedAvgPrice;   // Total value (price * amount sum)
signal output numWinners;         // Number of winning bids
```

**Note**: `winnerBitmask` was removed as it's redundant with `originalWinnerBits`. External systems can compute the bitmask if needed: `bitmask = sum(originalWinnerBits[i] * 2^i)`

## Circuit Logic Flow

### 1. Commitment Verification
```circom
// Verify each bid matches its commitment
component hasher[N];
for (var i = 0; i < N; i++) {
    hasher[i] = Poseidon(4);
    hasher[i].inputs[0] <== bidPrices[i];
    hasher[i].inputs[1] <== bidAmounts[i]; 
    hasher[i].inputs[2] <== bidderAddresses[i];
    hasher[i].inputs[3] <== commitmentContractAddress;
    hasher[i].out === commitments[i]; // Assert hash matches
}
```

### 2. Sorting Verification  
```circom
// Verify sortedPrices/sortedAmounts are correct permutation of originals
component sortingVerifier = SortingVerifier(N);
sortingVerifier.originalPrices <== bidPrices;
sortingVerifier.originalAmounts <== bidAmounts;
sortingVerifier.sortedPrices <== sortedPrices;
sortingVerifier.sortedAmounts <== sortedAmounts;
sortingVerifier.sortedIndices <== sortedIndices;
```

### 3. Winner Calculation (Sorted Order)
```circom
signal isWinner[N];  // Calculated winners in SORTED order

for (var i = 0; i < N; i++) {
    // Check capacity constraint
    canFit[i].in[0] <== cumulativeFill[i] + sortedAmounts[i];
    canFit[i].in[1] <== makerMaximumAmount + 1;  // LessThan(a, b+1) = a ≤ b
    
    // Check price constraint  
    priceOK[i].in[0] <== sortedPrices[i];
    priceOK[i].in[1] <== makerMinimumPrice;      // GreaterEqThan
    
    // Check non-zero constraint
    nonZero[i].in[0] <== sortedAmounts[i];
    nonZero[i].in[1] <== 0;                      // GreaterThan
    
    // Winner = ALL constraints satisfied
    isWinner[i] <== canFit[i].out * priceOK[i].out * nonZero[i].out;
}
```

### 4. Winner Validation (🚨 BROKEN)

**Current Implementation (INCORRECT)**:
```circom
// This compares original order vs sorted order - WRONG!
for (var i = 0; i < N; i++) {
    bitValidator[i].in[0] <== winnerBits[i];      // Original order
    bitValidator[i].in[1] <== isWinner[i];        // Sorted order  
    bitValidator[i].out === 1; // ASSERTION FAILS!
}
```

**Required Fix**:
```circom
// Need to translate winnerBits from original to sorted order
signal sortedWinnerBits[N];

// Create reverse permutation mapping
component permuter[N];
for (var i = 0; i < N; i++) {
    // Find which original position maps to sorted position i
    permuter[i] = PermutationSelector(N);
    permuter[i].sortedIndices <== sortedIndices;
    permuter[i].targetIndex <== i;
    permuter[i].winnerBits <== winnerBits;
    sortedWinnerBits[i] <== permuter[i].out;
}

// Now compare in same order
for (var i = 0; i < N; i++) {
    bitValidator[i].in[0] <== sortedWinnerBits[i];  // Sorted order
    bitValidator[i].in[1] <== isWinner[i];          // Sorted order
    bitValidator[i].out === 1; // Should work!
}
```

## Example Data Flow

### Input Data
```
Original Bids:  [600@200, 1000@100, 400@250, 800@150]
Sorted Bids:    [1000@100, 800@150, 600@200, 400@250]  
sortedIndices:  [1, 3, 0, 2]  // sorted[0] came from original[1], etc.
```

### Winner Calculation (Sorted Order)
```
makerMaximumAmount = 500
Sorted[0]: 1000@100, cumulative=100 ≤ 500 ✓ → Winner
Sorted[1]: 800@150,  cumulative=250 ≤ 500 ✓ → Winner  
Sorted[2]: 600@200,  cumulative=450 ≤ 500 ✓ → Winner
Sorted[3]: 400@250,  cumulative=700 > 500 ✗ → Not Winner

isWinner = [1, 1, 1, 0]  // Sorted order
```

### Required winnerBits Translation
```
isWinner (sorted):     [1, 1, 1, 0]
sortedIndices:         [1, 3, 0, 2]

winnerBits (original): [?, ?, ?, ?]
- original[0] → sorted[2] → winner=1
- original[1] → sorted[0] → winner=1  
- original[2] → sorted[3] → winner=0
- original[3] → sorted[1] → winner=1

winnerBits (original): [1, 1, 0, 1] ✓
```

## Constraint Analysis

- **Template instances**: 82
- **Non-linear constraints**: 10,547  
- **Linear constraints**: 3,708
- **Public inputs**: 11
- **Private inputs**: 56
- **Wires**: 14,253

## Security Properties

### What the Circuit Proves
1. **Commitment Binding**: Each bid matches its on-chain commitment
2. **Sorting Correctness**: Provided sorting is a valid permutation
3. **Auction Logic**: Winners determined by capacity + price constraints
4. **Winner Knowledge**: Prover knows winners in original order (once fixed)

### What Remains Private
- Individual bid values and addresses
- The permutation mapping (sortedIndices)
- Which specific bidders won

### Attack Vectors (Mitigated)
- **Malicious Sorting**: Prevented by permutation verification
- **Invalid Winners**: Prevented by auction logic constraints  
- **Commitment Mismatch**: Prevented by hash verification
- **Replay Attacks**: Prevented by contract address binding

## Testing Status

### ✅ Passing Tests
- Sorted inputs (identity permutation)
- Invalid sorting rejection
- Malicious permutation detection  
- Edge cases (zero amounts, etc.)

### ❌ Failing Test (CRITICAL)
- **"should verify unsorted input with correct permutation"**
- **Root Cause**: winnerBits permutation translation missing
- **Fix Required**: Implement sortedWinnerBits translation logic

## Performance Considerations

- **Proving Time**: ~2-3 seconds (acceptable for hackathon)
- **Verification Time**: <100ms on-chain
- **Proof Size**: ~256 bytes (Groth16)
- **Gas Cost**: ~300k gas for verification

---

*This circuit implements the core privacy-preserving auction logic but requires the winnerBits permutation fix to handle the main use case.* 
