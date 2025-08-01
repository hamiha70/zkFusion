# Gaps & Demo Implementation Roadmap for zkFusion (v2.0 FINAL)

**Date:** August 1, 2025
**Status:** Phase 1 Complete, High-Confidence plan for Phase 2 defined.

**Objective:** To provide a prioritized, actionable implementation roadmap based on our validated analysis of the 1inch Limit Order Protocol.

---
## ✅ **Phase 1: Core Logic & Proof Pipeline Validation - COMPLETE**

-   [x] **Task 1.1 (Circuit):** Circuit logic finalized (4-input Poseidon, `totalValue` output) and recompiled.
-   [x] **Task 1.2 (Testing):** All 7 core business logic tests in `test-circuits/zkDutchAuction.test.ts` are passing.
-   [x] **Task 1.3 (Proof Pipeline):** Full Groth16 proof generation and verification confirmed to work in ~5.3 seconds using production artifacts. **95% technical confidence achieved.**
-   [x] **Task 1.4 (Integration Analysis):** Deep-dive into 1inch LOP contracts and SDK is complete. A clear, code-backed integration path is defined in `docs/LimitOrderProtocol-Analysis-Demo-Insights.md`.

---

## 🚀 **Phase 2: On-Chain & Off-Chain Implementation (The Demo)**

This phase implements the demo script and contract interactions based on our validated research.

**Priority 1: Contract Refactoring (Backend Foundation)**
*   [ ] **Task 2.1: Refactor `BidCommitment.sol`**
    *   Change the `commitments` mapping to a fixed `uint256[8]` array.
    *   Add a corresponding `address[8]` array for `bidderAddresses`.
    *   Implement the two-phase `initialize(nullHash, bidders)` function, where the `nullHash` is computed off-chain.
*   [ ] **Task 2.2: Implement `ZkFusionGetter.sol`**
    *   Create a new contract `ZkFusionGetter.sol` that implements the `IAmountGetter` interface.
    *   Implement the `getTakingAmount(Order, extension, ...)` function.
    *   **Logic:**
        1.  Decode `proof`, `publicSignals`, and `commitmentContractAddress` from the `extension` bytestring. The first 20 bytes of `extension.takingAmountData` will be this contract's address, and the rest is our data.
        2.  Call the `zkFusionExecutor.verifyAuctionProof(...)` view function, passing it the decoded data.
        3.  The `verifyAuctionProof` function will return the `totalTakingAmount`.
        4.  Return the `totalTakingAmount` from `getTakingAmount`.
*   [ ] **Task 2.3: Update `zkFusionExecutor.sol`**
    *   Implement the `verifyAuctionProof(proof, publicSignals, commitmentContractAddress)` **view function**.
    *   **Logic:**
        1.  Load the `BidCommitment` contract at the provided address.
        2.  Read the `commitments` array from it.
        3.  Construct the full list of public inputs for the verifier (on-chain commitments + `originalWinnerBits` from the proof data).
        4.  Call `Verifier.verifyProof(...)`.
        5.  If valid, return the `totalValue` (taking amount) from the public signals. If invalid, revert.

**Priority 2: Off-Chain Scripting (The Demo Core)**
*   [ ] **Task 2.4: Create Minimal 1inch LOP Integration Test (`test/1inch-extension-prototype.js`)**
    *   **Goal:** Create a small, focused Hardhat test to de-risk the most complex part of the `demo.ts` script.
    *   Use the `@1inch/limit-order-sdk`.
    *   Create a dummy ZK proof and public signals.
    *   Implement the `extension` object creation logic as detailed in the analysis document.
    *   Build and sign a `LimitOrder` with the extension.
    *   This script will not execute a fill, but will log the final signed order and calldata, proving our off-chain logic is correct.
*   [ ] **Task 2.5: Build Full `demo.ts` Script**
    *   Implement the full 4-step demo flow as detailed in `docs_demo/5_demo_script_and_UI.md`.
    *   Integrate the now-tested LOP extension logic from Task 2.4.
    *   Use the validated proof generation pipeline from our `test-proof-generation.js` script.

**Priority 3: Deployment & Final Touches**
*   [ ] **Task 2.6: Create Deployment Scripts**
    *   Write Hardhat scripts to deploy `Verifier.sol`, `CommitmentFactory.sol`, `zkFusionExecutor.sol`, and `ZkFusionGetter.sol` to the local forked network.
*   [ ] **Task 2.7: Build the UI**
    *   Create the simple, one-page dashboard that calls the functions in `demo.ts`.

---

**Total Estimated Time: 10-15 Hours** 