# zkFusion Validation Specification

**Version**: 1.0  
**Date**: July 2025  
**Status**: DRAFT - Under Review  

---

## 🎯 **OVERVIEW**

This document defines the complete validation specification for zkFusion Dutch auctions with N=8 maximum bidders, including circuit design, input/output structures, and validation requirements.

## 📊 **SYSTEM PARAMETERS**

- **Maximum Bidders**: N = 8
- **Hash Function**: ✅ **Poseidon(5)** - Optimized for ZK circuits and EVM compatibility
- **Circuit Type**: Groth16 via Circom
- **Auction Type**: Dutch auction (descending price priority)

---

## 🔢 **CIRCUIT INPUTS**

### **Private Inputs (Hidden from Public)**

#### **1. Bid Data Arrays [8 elements each]**
```circom
signal private input bidPrices[8];        // Bid prices in wei (per unit)
signal private input bidAmounts[8];       // Bid amounts in wei (total quantity)
signal private input bidderAddresses[8];  // Bidder addresses (for hash binding)
signal private input nonces[8];           // Random nonces for hash uniqueness
```

#### **2. Sorting Information**
```circom
signal private input sortedIndices[8];    // Permutation: sorted_position → original_position
```
**Example**: If bids [100, 300, 200] → sorted [300, 200, 100], then `sortedIndices = [1, 2, 0]`

### **Public Inputs (Known to Verifier)**

#### **3. Commitment Data**
```circom
signal input commitments[8];              // Poseidon hashes from commitment contract
signal input commitmentContractAddress;  // Contract address (replay protection)
```

#### **4. Auction Constraints**
```circom
signal input makerMinimumPrice;          // Minimum price per token (wei per token)
signal input makerMaximumAmount;         // Maximum tokens to sell (quantity limit)
```

**Constraint Explanation**:
- **Price Constraint**: Each winning bid must offer ≥ `makerMinimumPrice` per token
- **Quantity Constraint**: Total winning amounts must not exceed `makerMaximumAmount` tokens
- **1inch LOP Mapping**: 
  - `makerMaximumAmount` → `order.makingAmount` (tokens to sell)
  - `makerMinimumPrice * actualFill` → `order.takingAmount` (minimum payment expected)

---

## 📤 **CIRCUIT OUTPUTS**

### **✅ CHOSEN: Aggregated Outputs (Efficiency + Privacy)**
```circom
signal output totalFill;                 // Total amount filled (wei)
signal output weightedAvgPrice;          // Volume-weighted average price (wei per unit)
signal output numWinners;                // Number of winning bids
signal output winnerBitmask;             // 8-bit mask: bit i = 1 if bidder i won
```

**Rationale**: 
- **Gas Efficient**: Only 4 public outputs vs 17
- **Privacy Preserving**: Individual bid details remain hidden
- **Sufficient Information**: All necessary data for settlement

---

## 🔐 **POSEIDON HASH SPECIFICATION**

### **✅ CONFIRMED: 5-Input Poseidon Hash**
```
commitment = Poseidon(bidPrice, bidAmount, bidderAddress, commitmentContractAddress, nonce)
```

**Security Properties**:
- **Bid Binding**: Cannot change bid after commitment
- **Address Binding**: Bid tied to specific bidder (prevents theft)
- **Contract Binding**: Tied to specific auction (prevents replay attacks)
- **Randomness**: Nonce prevents hash collisions
- **ZK Friendly**: Efficient constraint count in circuits

---

## ✅ **CIRCUIT VALIDATION REQUIREMENTS**

### **1. Commitment Verification (5-Input Poseidon)**
```circom
component hasher[8];
for (var i = 0; i < 8; i++) {
    hasher[i] = Poseidon(5);
    hasher[i].inputs[0] <== bidPrices[i];
    hasher[i].inputs[1] <== bidAmounts[i];
    hasher[i].inputs[2] <== bidderAddresses[i];
    hasher[i].inputs[3] <== commitmentContractAddress;
    hasher[i].inputs[4] <== nonces[i];
    hasher[i].out === commitments[i];
}
```

### **2. Sorting Validation (Dutch Auction Logic)**
```circom
// Verify bids are sorted by price descending using sortedIndices
component sortVerifier = SortingVerifier(8);
sortVerifier.originalPrices <== bidPrices;
sortVerifier.originalAmounts <== bidAmounts;
sortVerifier.sortedIndices <== sortedIndices;
```

### **3. Dual Constraint Enforcement**
```circom
// A) Price Constraint: Each winning bid must meet minimum price per token
component minPriceCheck[8];
for (var i = 0; i < 8; i++) {
    minPriceCheck[i] = GreaterEqThan(64);
    minPriceCheck[i].in[0] <== sortedPrices[i];
    minPriceCheck[i].in[1] <== makerMinimumPrice;
    // Only enforce for winners: if isWinner[i] == 1, then price must be >= minimum
    minPriceCheck[i].out * isWinner[i] === isWinner[i];
}

// B) Quantity Constraint: Total tokens sold must not exceed maximum
totalFill <== cumulativeFill[8];
component maxQuantityCheck = LessThan(64);
maxQuantityCheck.in[0] <== totalFill;
maxQuantityCheck.in[1] <== makerMaximumAmount + 1;  // +1 for strict less-than
maxQuantityCheck.out === 1;
```

**Constraint Logic**:
- **Price**: `sortedPrices[i] ≥ makerMinimumPrice` for all winners
- **Quantity**: `∑(winning amounts) ≤ makerMaximumAmount`
- **Integration**: Ensures both quality (price) and quantity limits are respected

### **4. Winner Selection Logic (Greedy Fill)**
```circom
signal cumulativeFill[9];
signal isWinner[8];
cumulativeFill[0] <== 0;

for (var i = 0; i < 8; i++) {
    // Check if this bid fits within remaining token capacity
    component canFit = LessThan(64);
    canFit.in[0] <== cumulativeFill[i] + sortedAmounts[i];
    canFit.in[1] <== makerMaximumAmount + 1;
    
    // Check if price meets minimum requirement per token
    component priceOK = GreaterEqThan(64);
    priceOK.in[0] <== sortedPrices[i];
    priceOK.in[1] <== makerMinimumPrice;
    
    // Winner if BOTH constraints satisfied: fits capacity AND meets price
    isWinner[i] <== canFit.out * priceOK.out;
    
    // Update cumulative fill with this bid (if winner)
    cumulativeFill[i+1] <== cumulativeFill[i] + isWinner[i] * sortedAmounts[i];
}
```

**Greedy Algorithm Logic**:
1. **Sort bids by price descending** (highest price first)
2. **For each bid in order**:
   - Check if adding this bid would exceed `makerMaximumAmount` tokens
   - Check if bid price meets `makerMinimumPrice` per token
   - Include bid only if BOTH constraints satisfied
3. **Result**: Maximum value extraction within quantity and price limits

### **5. Bitmask Validation**
```circom
// Validate that winnerBitmask correctly represents winners
component bitValidator[8];
for (var i = 0; i < 8; i++) {
    bitValidator[i] = IsEqual();
    bitValidator[i].in[0] <== (winnerBitmask >> i) & 1;
    bitValidator[i].in[1] <== isWinner[i];
    bitValidator[i].out === 1; // Bit i must equal isWinner[i]
}
```

---

## 🎯 **DESIGN DECISIONS CONFIRMED**

### **✅ Confirmed Choices**
1. ✅ **Poseidon(5) Hash**: ZK-friendly, EVM-compatible, secure
2. ✅ **Address Binding**: Essential for security (prevents bid theft/replay)
3. ✅ **Aggregated Outputs**: Efficient gas usage, sufficient information
4. ✅ **SortedIndices Approach**: Optimal permutation proof method
5. ✅ **Dual Constraints**: Price per token AND maximum quantity validation
6. ✅ **1inch LOP Integration**: Direct mapping to `makingAmount` and `takingAmount`

---

## 🔧 **IMPLEMENTATION ROADMAP**

### **Phase 1: Circuit Redesign** (4 hours)
- [ ] Update to Poseidon(5) hash
- [ ] Add bidderAddress handling
- [ ] Implement dual constraint validation
- [ ] Add bitmask validation
- [ ] Remove const declarations (Circom incompatible)

### **Phase 2: Contract Updates** (2 hours)
- [ ] Update BidCommitment with address tracking
- [ ] Implement Poseidon(5) in Solidity
- [ ] Update zkFusionExecutor for new outputs
- [ ] Add dual constraint verification

### **Phase 3: Integration** (2 hours)
- [ ] Update input generation for new hash
- [ ] Recompile circuit and trusted setup
- [ ] Update all tests
- [ ] End-to-end validation

**Total Estimated Time**: ~8 hours

---

**Status**: ✅ **SPECIFICATION COMPLETE - READY FOR IMPLEMENTATION**

All design decisions confirmed. Dual constraints clearly defined:
- **Price Constraint**: Each winning bid ≥ `makerMinimumPrice` per token  
- **Quantity Constraint**: Total winning amounts ≤ `makerMaximumAmount` tokens
- **1inch Integration**: Perfect mapping to LOP order structure 