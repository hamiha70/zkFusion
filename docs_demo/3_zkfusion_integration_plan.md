# zkFusion Integration Plan for 1inch Limit Order Protocol (v2)

**Date:** July 31, 2025
**Confidence Level:** High

---

## 🎯 **Executive Summary: The Refined Integration Path**

This document outlines a revised, more robust plan to integrate `zkFusion` with the 1inch LOP.

**The core concept is now a two-phase, cryptographically constrained process:**
1.  **Commit Phase:** Multiple independent resolvers commit hashed bids to a dedicated, on-chain `commitmentContract` for a specific maker order.
2.  **Settle Phase:** A "Meta Resolver" (your Auction Runner) collects the revealed bids off-chain, runs the ZK Dutch auction, generates a proof, and uses this proof to settle the order via a LOP `getTakingAmount` extension.

**The ZK proof's critical role is to prove that the auction result was derived *honestly* from the publicly committed bids.** This makes the Auction Runner a trustless prover, not a trusted auctioneer.

---

## 🔧 **Architectural Overview (v2): The "Meta Resolver" Flow**

This new flow is more decentralized and verifiable.

**Flow:**
1.  **Maker Order & Auction Creation:** A Maker's order is picked up by the **Auction Runner**. The Runner deploys a new `BidCommitment` contract from your `CommitmentFactory`, binding it to the Maker's order hash.
2.  **Resolvers Commit Bids:** Individual resolvers see the new auction contract. They submit their bids by calling `submitBid(commitment)` on-chain, where `commitment` is a `Poseidon(price, amount, nonce, ...)` hash. They also send the raw, un-hashed bid data to the Auction Runner privately via an off-chain API.
3.  **Auction Runner Closes Bidding:** After a set time (or number of bids), the Runner closes the `BidCommitment` contract.
4.  **Proof Generation:** The Runner executes the Dutch auction logic off-chain using the revealed bids it received. It validates that each revealed bid matches its on-chain commitment hash. It then generates the Groth16 ZK proof.
5.  **Taker (Auction Runner) Fills Order:** The Auction Runner now acts as the Taker. It calls `fillOrder` on the 1inch LOP, providing the address of a `ZkFusionGetter` contract in the `getTakingAmount` extension.
6.  **1inch LOP Calls Your Getter:** The LOP makes a `staticcall` to your `ZkFusionGetter`. The calldata for this call contains the ZK proof and the address of the `BidCommitment` contract.
7.  **Your Getter Verifies Everything:** The `ZkFusionGetter` calls your `zkFusionExecutor`, which now has a crucial new responsibility: it must read the `commitments` array directly from the specified `BidCommitment` contract on-chain and use these values as a **public input** to the ZK proof verification.
8.  **Settlement:** If the proof is valid (meaning the auction result honestly reflects the on-chain commitments), the getter returns the final `takingAmount` to the LOP for settlement.

---

## 🛠 **Detailed Integration Steps (v2)**

### **Step 1: Enhance Contracts for the New Flow**

Your existing contracts are already very close to what's needed.

*   **`BidCommitment.sol`:** Ensure it stores bidder addresses alongside commitments, as this is needed to construct the public inputs for the ZK proof. Your spec `docs/zkFusion-validation-spec.md` already outlines this perfectly with its `uint256[8]` and `address[8]` arrays.
*   **`zkFusionExecutor.sol` (Major Change):** The `executeWithProof` function (or a new `verifyProof` view function) must now accept the `commitmentContractAddress` as an argument. Inside the function, it will perform a series of `staticcall`s to the `commitmentContract` to read the array of 8 commitments and use them as the public inputs for the `verifier.verifyProof()` call. This is the cryptographic link that makes the system trustless.
*   **`ZkFusionGetter.sol` (New Contract):** This remains the bridge, but its `getTakingAmount` function now needs to accept the `commitmentContractAddress` and pass it along to the executor.

```solidity
// file: contracts/ZkFusionGetter.sol (Updated)

function getTakingAmount(
    bytes calldata extensionData
) external view returns (uint256) {
    // 1. Decode data, which now includes the commitment contract address
    (
        uint[8] memory proof,
        uint[4] memory publicOutputs,
        address commitmentContractAddress
        // ... other necessary data
    ) = abi.decode(extensionData, (uint[8], uint[4], address /*, ...*/));

    // 2. Call the executor's VIEW function to verify the proof against on-chain state
    bool isValid = zkFusionExecutor.verifyAuctionProof(
        proof,
        publicOutputs,
        commitmentContractAddress
    );
    require(isValid, "Invalid ZK proof against on-chain commitments");

    // 3. Extract results and return the final taking amount
    uint256 totalFill = publicOutputs[0];
    uint256 weightedAvgPrice = publicOutputs[1];
    uint256 finalTakingAmount = (totalFill * weightedAvgPrice) / (1e18); // Example

    return finalTakingAmount;
}
```

### **Step 2: Update the ZK Circuit**

Your circuit's public inputs must now include the array of 8 bid commitments. The circuit will then re-calculate the Poseidon hash for each private bid it receives and assert that `calculated_hash == committed_hash`. Your `zkFusion-validation-spec.md` already specifies this perfectly; it just needs to be implemented.

### **Step 3: Update the Off-Chain Components**

*   **Auction Runner (Meta Resolver):**
    1.  Deploy a new `BidCommitment` contract.
    2.  Broadcast the new contract address to other resolvers.
    3.  Run an API endpoint to receive revealed bids.
    4.  After a timeout, fetch all commitments from the on-chain contract.
    5.  Validate received off-chain bids against on-chain commitments.
    6.  Generate the ZK proof.
    7.  Craft the `extensionData` including the proof and the `commitmentContractAddress`.
    8.  Build and sign the final 1inch LOP order with the extension.
    9.  Call `fillOrder` on the LOP contract.

### **What I Know and Don't Know**

*   **I KNOW THIS FLOW IS TECHNICALLY SOUND:** This commit-reveal scheme combined with ZK proofs is a standard and powerful pattern in blockchain for verifiable off-chain computation. It directly addresses the trust issue of the Auction Runner.
*   **I KNOW YOUR EXISTING CONTRACTS ARE 90% THERE:** Your design documents show you've already thought through most of this, especially the fixed-array commitment structure. The main missing piece is making the executor *read* this on-chain state during verification.
*   **I AM LESS SURE ABOUT THE COMPLEXITY OF THE OFF-CHAIN RUNNER:** Building the "Meta Resolver" is the most significant new piece of work. For the hackathon, this can be a single script that simulates all roles (deploying, receiving bids, generating proof, settling), but it still requires careful implementation.

---

## ✅ **Feasibility Analysis: Gas Costs & `staticcall` Limits**

A critical question is whether the on-chain ZK proof verification is feasible within the gas constraints of the 1inch LOP's `staticcall`.

*   **Estimated Verification Cost:** Your project's `zkProof-Gas-Cost-Time-estimation.md` document estimates the gas for `verifier.verifyProof()` to be **~350,000 gas** on an L2 like Arbitrum.
*   **EVM `staticcall` Gas Limit:** A `staticcall` does not have a small, fixed gas limit. Instead, it receives most of the gas available to the contract that calls it. This is governed by the "63/64th rule" (EIP-150), meaning it gets at least 63/64ths of the parent call's remaining gas.
*   **1inch LOP Context:** The `fillOrder` function on the LOP will have a transaction gas limit in the millions. Therefore, the gas passed to your `ZkFusionGetter` will be more than sufficient to cover the ~350,000 gas required for proof verification.

**Conclusion: High Confidence.** The on-chain verification portion of this architecture is **highly feasible** and will not be blocked by `staticcall` gas limits. The primary consideration is the overall transaction cost for the user, which remains reasonable on an L2.

---

## 🚀 **Updated Demo Flow**

Your demo is now much more powerful:
1.  **Show the `BidCommitment` contract on a block explorer**, with several hashed commitments from different "resolver" addresses.
2.  **Run your off-chain Auction Runner script.** Explain that it's fetching these on-chain commitments.
3.  **Show the script generating a ZK proof.**
4.  **Execute the `fillOrder` transaction.**
5.  **Show the transaction succeeding** on the block explorer and explain that the transaction *would have failed* if the ZK proof didn't correctly match the on-chain commitments, proving the auction was fair and could not be manipulated. 
