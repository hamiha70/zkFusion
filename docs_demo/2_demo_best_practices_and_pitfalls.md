# Hackathon Insights: Demo Best Practices & Common Pitfalls

**Date:** July 31, 2025
**Confidence Level:** High (Synthesized from Discord chat, YouTube workshops, and project check-ins)

---

## 🎯 **1. Best Practices for a Winning LOB Extension Demo**

### **Must-Haves:**

1.  **Clear On-Chain Execution & Verifiability (CRITICAL):**
    *   **Show the `BidCommitment` contract:** Before the main transaction, show the `BidCommitment` contract on a block explorer, populated with several hashed bids from different "resolver" addresses.
    *   **Explain the Cryptographic Link:** State clearly: *"The Auction Runner is bound by these on-chain commitments. The ZK proof we are about to generate cryptographically guarantees that the auction result is a fair outcome based *only* on these public commitments, with no ability for the runner to censor bids or manipulate the outcome."*
    *   **Show the `fillOrder` Call:** The final transaction must be a call to the 1inch LOP's `fillOrder` function, which then calls your `ZkFusionGetter`.
    *   **Explain the Result:** After the transaction succeeds, reiterate that the settlement was only possible because the ZK proof was valid *against the on-chain state* of the `BidCommitment` contract.

2.  **Off-Chain & On-Chain Separation:** Clearly explain the two parts of your system:
    *   **Off-Chain ("Meta Resolver"):** The Auction Runner script that deploys the `BidCommitment` contract, collects private bids, generates the proof, and submits the final transaction.
    *   **On-Chain (The Extension):** The `ZkFusionGetter` and `zkFusionExecutor` contracts that are called *by the 1inch LOP* to verifiably compute the final settlement amount.

3.  **Show the "Why":** Focus on your new, stronger value proposition.
    *   **SPEED:** "A standard on-chain Dutch auction is tied to block times, taking minutes to settle. By moving the auction off-chain into a ZK circuit, `zkFusion` achieves near-instant settlement, decoupling price discovery from slow block production and reducing the maker's price risk."
    *   **VERIFIABILITY:** "Our 'Meta Resolver' is not a trusted auctioneer. It is a trustless *prover*. The ZK proof guarantees it has run the auction fairly according to the public, on-chain commitments."

4.  **Reference the 1inch Architecture:** Explicitly mention that you are using the `getTakingAmount` extension. This shows the judges you've understood their protocol's design.

---

## ⚠️ **2. Common Pitfalls & Issues Encountered by Other Teams**

### **Technical Pitfalls:**

1.  **Gas Issues within `staticcall` (FEASIBILITY CHECKED):**
    *   **Problem:** The `getTakingAmount` function is executed via `staticcall`, which has gas limits.
    *   **Your Solution (VERIFIED):** Your `zkProof-Gas-Cost-Time-estimation.md` estimates proof verification at **~350,000 gas**. The EVM `staticcall` opcode can receive almost all of the gas from the parent call (millions of gas, governed by the 63/64 rule). **Your gas cost is well within this limit. This is feasible.** Mentioning this analysis in your demo will impress the judges.

---

## 🚨 **3. CRITICAL IMPLEMENTATION PITFALL: Circom Version Compatibility**

### **⚠️ THE TRAP - Poseidon Hash Mismatches**

**DISCOVERED:** August 1, 2025  
**SEVERITY:** Critical - Blocks all ZK proof generation  
**ROOT CAUSE:** Circom compiler version incompatibility affecting Poseidon hash functions

### **The Problem:**
- **`npx circom`** uses deprecated version **0.5.46** (JavaScript-based, deprecated)
- **`circom`** uses current version **2.2.2** (Rust-based, active)
- **Different Poseidon implementations** produce completely different hashes
- **JavaScript libraries** like `circomlibjs` are compatible with circom 0.5.x, NOT 2.x

### **Symptoms:**
```
Error: Assert Failed. Error in template zkDutchAuction_81 line: 98
```
- Circuit compiles successfully but witness generation fails
- Hash verification constraints fail in the circuit
- Tests pass for JavaScript logic but fail for circuit integration

### **Evidence:**
```javascript
// Test inputs: [1, 2, 3, 4]
circomlibjs result:  22fa2af8c56f9d8481cb75a238d9e4f001525256132e1365bb572e22fc5dfdd5
poseidon-lite result: 299c867db6c1fdd79dcefa40e4510b9837e60ebb1ce0663dbaa525df65250465 ✅
Reference expected:   299c867db6c1fdd79dcefa40e4510b9837e60ebb1ce0663dbaa525df65250465 ✅
```

### **The Solution:**

1. **NEVER use `npx circom`** - it uses the deprecated 0.5.46 version
2. **ALWAYS use `circom` directly** - the Rust-based 2.x.x version
3. **Use `poseidon-lite` library** for JavaScript hashing, NOT `circomlibjs`
4. **Update all hash utilities** to use compatible libraries

### **Prevention Checklist:**
- [ ] Verify `circom --version` shows 2.x.x (not 0.5.x)
- [ ] Never use `npx circom` in scripts or commands
- [ ] Use `poseidon-lite` for all JavaScript Poseidon hashing
- [ ] Test hash compatibility between JavaScript and circuit
- [ ] Document compiler versions in your setup instructions

### **Files to Update:**
- **Compilation commands:** Use `circom` not `npx circom`
- **Hash utilities:** Replace `circomlibjs` with `poseidon-lite`
- **Input generators:** Ensure consistent hash function usage
- **Cursor rules:** Document the correct compilation approach

**This pitfall cost multiple hours of debugging and could have been prevented with proper version documentation.** 
