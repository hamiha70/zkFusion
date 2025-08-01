# Gaps & Demo Implementation Roadmap for zkFusion (v1.2 FINAL)

**Objective:** To provide a prioritized, actionable implementation roadmap based on the **final, correct architecture**.

---
##  GAP ANALYSIS: Code vs. Demo Requirements (FINAL)

### **1. ZK Circuit (`zkDutchAuction.circom`)**

*   **GAP 1 (Minor Simplification): 4-Input Hash.**
    *   **Action:** Update the `hasher` component to be `Poseidon(4)`, removing the `nonce` input.
    *   **Confidence:** High.
*   **GAP 2 (Minor Rename):**
    *   **Action:** Rename the output signal `weightedAvgPrice` to `totalValue`.
    *   **Confidence:** High.
*   **GAP 3 (No Code Change): `originalWinnerBits` is Correct.**
    *   **Action:** No change is needed. The circuit correctly validates the `originalWinnerBits` public input against the internal auction logic, ensuring the prover cannot lie.
    *   **Confidence:** High.

### **2. On-Chain Contracts**

#### **`zkFusionExecutor.sol`**

*   **GAP 1 (Critical): On-Chain State Verification.**
    *   **Action:** Create a `verifyAuctionProof` view function that reads the `commitments` array from the `BidCommitment` contract. It must also accept the `originalWinnerBits` array as an argument to construct the full public input list for the `verifier.verifyProof` call.
    *   **Confidence:** High.

(Other contract gaps remain the same as the previous version)

---

## 🚀 **Implementation Roadmap (FINAL & PRIORITIZED)**

The "Risk-First, Validate Early" approach remains the best path.

**Phase 1: Prove the Hardest Parts Work (Est. 1-2 Hours)**
*   [ ] **Task 1.1 (Circuit):**
    1.  Update `zkDutchAuction.circom` to use the 4-input Poseidon hash.
    2.  Rename `weightedAvgPrice` output to `totalValue`.
    3.  Recompile the circuit, run the trusted setup, and **generate the new `Verifier.sol` contract.** This is a critical step as the public inputs for the verifier will have changed.
*   [ ] **Task 1.2 (Integration):** Prototype the 1inch LOP extension call in a test script.

**Phase 2: Wire the Core Flow (Est. 4-5 Hours)**
*   [ ] **Task 2.1 (Contracts):**
    1.  Refactor `BidCommitment.sol`.
    2.  Implement the `verifyAuctionProof` view function in `zkFusionExecutor.sol`, making sure it accepts `originalWinnerBits`.
    3.  Deploy all contracts in a local test environment.
*   [ ] **Task 2.2 (Scripting):** Build the minimal, end-to-end `demo.ts` script. The script must first determine the winners off-chain to create the `originalWinnerBits` array before passing it to the prover.

**Phase 3: Polish & Production (Est. 5-7 Hours)**
*   (Tasks remain the same)

**Total Estimated Time: 10-14 Hours** 