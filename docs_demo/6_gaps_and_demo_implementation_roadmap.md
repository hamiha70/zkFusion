# Gaps & Demo Implementation Roadmap for zkFusion

**Date:** July 31, 2025
**Objective:** To identify the precise gaps between the current `zkFusion` codebase and the requirements of the "One-Page Miracle" demo, and to provide a prioritized, actionable implementation roadmap.

---

## 🎯 **High-Level Summary: The Path to Demo Day**

**Your current codebase is a strong foundation, but it's not yet a cohesive, integrated protocol.** The core components (circuits, executor concept) are there, but they need to be wired together and adapted to the specific, verifiable flow we've designed.

**The most significant work is:**
1.  **Refactoring the on-chain contracts** to support the commit-reveal and verifiable auction flow.
2.  **Building the master off-chain script (`demo.ts`)** which acts as the brain for the entire demo.
3.  **Creating the simple "Dashboard" UI** as a visual aid.

---

##  GAP ANALYSIS: Code vs. Demo Requirements

Here is a detailed breakdown of what's existing, what's missing, and what needs to change.

### **1. ZK Circuit (`zkDutchAuction.circom`)**

*   **Existing:** A solid base circuit that verifies sorting and calculates auction winners.
*   **GAP 1 (Critical): Nonce & 5-Input Hash.** Your spec (`zkFusion-validation-spec.md`) correctly identifies the need for a **5-input Poseidon hash** `Poseidon(price, amount, bidderAddress, contractAddress, nonce)` for security. The current circuit `zkDutchAuction.circom` only implements a 4-input hash, omitting the crucial `nonce`.
    *   **Action:** Add `nonces[N]` as a private input and update the `hasher` component to be `Poseidon(5)`.
    *   **Confidence:** High. This is a straightforward but essential change.
*   **GAP 2 (Minor): Output Mismatch.** The circuit currently outputs `originalWinnerBits` as a public input, which is incorrect. The `winnerBitmask` should be a single `uint` output, as defined in your spec.
    *   **Action:** Remove `originalWinnerBits` as a public input. Add `winnerBitmask` as a `signal output` and add constraints to ensure it's calculated correctly from the `isWinner` signals.
    *   **Confidence:** High.

### **2. On-Chain Contracts**

#### **`BidCommitment.sol`**

*   **Existing:** A basic contract that stores one hash per `msg.sender` in a mapping.
*   **GAP 1 (Critical): Fixed-Array Structure.** The ZK circuit requires a fixed-size array of 8 commitments as a public input. A `mapping` is not suitable as it cannot be passed into the circuit.
    *   **Action:** Refactor the contract to use a fixed-size `uint256[8] public commitments` and `address[8] public bidderAddresses` array, exactly as specified in your `zkFusion-validation-spec.md`.
    *   **Action:** Implement the "two-phase deployment" pattern from your spec: an `initialize` function that the Auction Runner calls to populate the array with a pre-computed "null commitment" hash `Poseidon(0,0,0,address(this),0)`.
    *   **Confidence:** High. Your spec document provides the exact code structure needed.

#### **`zkFusionExecutor.sol`**

*   **Existing:** A skeleton contract that can verify a proof but lacks the crucial link to the on-chain commitments.
*   **GAP 1 (Critical): On-Chain State Verification.** The current `_verifyProof` function only checks the ZK proof in isolation. It **must** be updated to check the proof *against the on-chain state* of a specific `BidCommitment` contract.
    *   **Action:** Create a new `public view` function, e.g., `verifyAuctionProof(proof, publicOutputs, commitmentContractAddress)`.
    *   **Action:** Inside this new function, you must:
        1.  Create an instance of the `BidCommitment` contract: `BidCommitment bc = BidCommitment(commitmentContractAddress);`
        2.  Read the `commitments` array from it: `uint256[8] memory onChainCommitments = bc.commitments();`
        3.  Construct the full `publicInputs` array for the verifier, combining `onChainCommitments` with the other public signals.
        4.  Call `verifier.verifyProof()` with these comprehensive public inputs.
    *   **Confidence:** High. This is the most important smart contract change required.

*   **GAP 2 (Minor): Refactor for `staticcall`.** The existing `executeWithProof` function performs state changes.
    *   **Action:** Keep `executeWithProof` for the final settlement, but ensure it calls the new `verifyAuctionProof` view function first. The `ZkFusionGetter` will *only* call the view function.
    *   **Confidence:** High.

#### **`ZkFusionGetter.sol` & `IAmountGetter.sol`**

*   **Existing:** These contracts do not exist yet.
*   **GAP (Critical): Create from Scratch.**
    *   **Action:** Create a new file `contracts/interfaces/IAmountGetter.sol` and define the interface for the getter function.
    *   **Action:** Create the `ZkFusionGetter.sol` contract as detailed in `3_zkfusion_integration_plan.md`. Its primary role is to decode calldata and call the `zkFusionExecutor.verifyAuctionProof` view function.
    *   **Confidence:** High. The design is clear.

### **3. Off-Chain Script (`demo.ts`)**

*   **Existing:** This script does not exist yet.
*   **GAP (Critical): Create from Scratch.**
    *   **Action:** Create the master demo script following the blueprint in `5_demo_script_and_UI.md`. This is the largest piece of new *work*, as it orchestrates the entire process.
    *   **Key Sub-Tasks:**
        1.  Setup Hardhat/Foundry for Arbitrum forking.
        2.  Implement wallet setup and token minting via `anvil_impersonateAccount`.
        3.  Write deployment scripts for all your contracts.
        4.  Implement the logic for each of the 4 demo steps, including off-chain hashing, ZK proof generation (`snarkjs`), and crafting the complex calldata for the 1inch LOP `fillOrder` call.
    *   **Confidence:** Medium. While the steps are clear, implementing the off-chain logic, especially the ABI encoding for the extension, requires precision and will likely involve debugging.

### **4. Frontend UI**

*   **Existing:** Does not exist.
*   **GAP (High): Create from Scratch.**
    *   **Action:** Build the simple, single-page "Dashboard" UI as mocked up in the demo blueprint.
    *   **Trade-off:** You can choose between a simple React/Next.js app (more modern but more setup) or a single `index.html` file with vanilla JavaScript and `ethers.js` (faster to build, perfectly sufficient for the demo). **I recommend the vanilla JS approach to save time.**
    *   **Confidence:** High on the design, medium on implementation time depending on your frontend skills.

---

## 🚀 **Implementation Roadmap (Prioritized)**

This is the recommended order of operations to ensure a successful demo.

**Phase 1: On-Chain Foundation (Est. 4-6 Hours)**
*   [ ] **Task 1.1 (Circuit):** Update `zkDutchAuction.circom` to use a 5-input Poseidon hash (including `nonce`) and output `winnerBitmask`. Recompile and generate the new `verifier.sol`.
*   [ ] **Task 1.2 (Contract):** Refactor `BidCommitment.sol` to use the fixed-array, two-phase initialization structure from the spec.
*   [ ] **Task 1.3 (Contract):** Implement the new `verifyAuctionProof` view function in `zkFusionExecutor.sol` that reads state from the `BidCommitment` contract.
*   [ ] **Task 1.4 (Contract):** Create the new `ZkFusionGetter.sol` and its interface.
*   [ ] **Validation:** Write unit tests in Foundry/Hardhat to ensure all new and modified contract functions work as expected *in isolation*.

**Phase 2: Off-Chain Brains (Est. 6-8 Hours)**
*   [ ] **Task 2.1 (Setup):** Configure your project for Arbitrum mainnet forking. Write the setup part of `demo.ts` (forking, wallets, contract deployment, token minting).
*   [ ] **Task 2.2 (Scripting):** Implement the logic for `step1_createOrder` and `step2_submitBids` in `demo.ts`.
*   [ ] **Task 2.3 (Scripting):** Implement the logic for `step3_generateProof` in `demo.ts`. This is the most complex off-chain part.
*   [ ] **Task 2.4 (Scripting):** Implement the final settlement logic in `step4_settleOrder`, including crafting the LOP extension and calling `fillOrder`.
*   [ ] **Validation:** Run the entire `demo.ts` script from top to bottom in your terminal. **This is your first end-to-end test.** It must complete successfully before moving to the UI.

**Phase 3: The Visual Layer (Est. 3-5 Hours)**
*   [ ] **Task 3.1 (UI):** Build the static HTML/CSS for the "One-Page Miracle" dashboard.
*   [ ] **Task 3.2 (Integration):** Write the JavaScript to connect the 4 buttons on your UI to the 4 corresponding functions in your `demo.ts` script.
*   [ ] **Task 3.3 (Integration):** Add logic to update the UI's status fields and display contract addresses/transaction hashes returned from the script.
*   [ ] **Validation:** Perform a full, live practice of the demo using the UI. Click the buttons in order and ensure the dashboard updates correctly and the on-chain transactions succeed on your local fork.

**Total Estimated Time: 13-19 Hours** 