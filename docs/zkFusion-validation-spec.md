# zkFusion Validation Specification

**Version**: 1.2  
**Date**: July 31, 2025  
**Status**: FINAL

---

## 🎯 **OVERVIEW**

This document defines the final validation specification for the zkFusion Dutch auction demo (N=8).

## 📊 **SYSTEM PARAMETERS**

- **Maximum Bidders**: N = 8
- **Hash Function**: ✅ **Poseidon(4)** - Simplified for demo; `commitmentContractAddress` provides replay protection.
- **Circuit Type**: Groth16 via Circom

---

## 🔢 **CIRCUIT INPUTS**

### **Private Inputs (Hidden from Public)**

```circom
signal private input bidPrices[8];        // Bid prices in wei (per unit)
signal private input bidAmounts[8];       // Bid amounts in wei (total quantity)
signal private input bidderAddresses[8];  // Bidder addresses (for hash binding)
signal private input sortedIndices[8];    // Permutation: sorted_position → original_position
// NOTE: Nonce removed for demo simplification.
```

### **Public Inputs (Known to Verifier)**

```circom
signal input commitments[8];              // Poseidon hashes from commitment contract
signal input commitmentContractAddress;  // Contract address (replay protection)
signal input makerMinimumPrice;          // Minimum price per token
signal input makerMaximumAmount;         // Maximum tokens to sell
signal input originalWinnerBits[8];      // A bitmask for winners in their original bid order.
```
**Security Note on `originalWinnerBits`**: This public input is safe because the circuit contains constraints that force it to match the internally computed, correct auction result. A proof will only be valid if the provided `originalWinnerBits` are honest.

---

## 📤 **CIRCUIT OUTPUTS**

```circom
signal output totalFill;                 // Total amount filled (wei)
signal output totalValue;                // Formerly weightedAvgPrice. Sum of (price * amount) for winners.
signal output numWinners;                // Number of winning bids
```
**Note**: The primary validation is that a proof can be generated for the given `originalWinnerBits`, effectively making the entire proof a single boolean output for the smart contract.

---

## 🔐 **POSEIDON HASH SPECIFICATION**

### **✅ REVISED: 4-Input Poseidon Hash**
```
commitment = Poseidon(bidPrice, bidAmount, bidderAddress, commitmentContractAddress)
```

---

## ✅ **CIRCUIT VALIDATION REQUIREMENTS**

The circuit's core logic remains as implemented. It correctly validates:
1.  **Commitment Verification:** That the private bids hash to the public `commitments` using a 4-input Poseidon hash.
2.  **Sorting & Permutation:** That the `sortedPrices` and `sortedWinnerBits` are correct permutations of the original inputs.
3.  **Winner Validation:** That the provided `originalWinnerBits` (permuted into `sortedWinnerBits`) match the winners as determined by the internal auction logic (`isWinner` signal). This is the key security constraint.

---

## HYBRID HASHING APPROACH
The off-chain generation and on-chain storage of hashes remains the recommended approach. The `BidCommitment.sol` contract will be refactored to use a fixed `uint256[8]` array and an `initialize` pattern. The null commitment will be calculated off-chain for a 4-input hash: `Poseidon(0,0,0,address(this))`. 