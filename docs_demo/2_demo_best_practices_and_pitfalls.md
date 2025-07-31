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
