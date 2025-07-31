# Blueprint: The zkFusion "One-Page Miracle" Demo

**Date:** July 31, 2025
**Objective:** To provide a comprehensive, step-by-step blueprint for creating a minimal, high-impact demo of the `zkFusion` protocol, including the UI, off-chain script, and on-chain interactions.

---

## 🎯 **Core Principle: Clarity Over Complexity**

The goal is not to build a production-ready dApp. The goal is to build a simple, single-page dashboard that makes the complex, innovative parts of `zkFusion` immediately understandable to the judges. Every button press and UI update should correspond to a critical step in your protocol's lifecycle.

---

## 💻 **UI Mockup: The Demo Dashboard**

This will be a single, simple webpage. It can be built with React, Vue, or even plain HTML and JavaScript. It acts as a real-time log of the demo process.

```
------------------------------------------------------------------
| zkFusion Demo Dashboard                                        |
| Network: [Arbitrum Mainnet Fork (Local)]                       |
------------------------------------------------------------------
| Accounts                                                       |
|   Maker Wallet:   [0xMAKER...] (Balance: [10 WETH])             |
|   Runner Wallet:  [0xRUNNER...] (Balance: [50,000 USDC])        |
------------------------------------------------------------------
| 1. Maker's Order & Auction Setup                               |
|    Status: [Inactive] -> [Order Signed] -> [Auction Live]      |
|    Maker Order Hash: [Pending...]                              |
|    Commitment Contract: [Pending...] (Etherscan Link)          |
|    [▶️ Step 1: Create Order & Deploy Contract] <--- Button 1    |
------------------------------------------------------------------
| 2. On-Chain Bid Commitments (Simulated Resolvers)              |
|    Status: [Waiting for Bids...] -> [4/4 Bids Committed]       |
|    [▶️ Step 2: Submit 4 Bid Hashes to Contract] <--- Button 2    |
|    --- On-Chain Hashes ---                                     |
|    - Bid 1 Hash: [0x...hash1...]                               |
|    - Bid 2 Hash: [0x...hash2...]                               |
|    - Bid 3 Hash: [0x...hash3...]                               |
|    - Bid 4 Hash: [0x...hash4...]                               |
------------------------------------------------------------------
| 3. Off-Chain Auction & ZK Proof Generation                     |
|    Status: [Pending...] -> [Auction Solved] -> [Proof Ready]   |
|    [▶️ Step 3: Run Auction & Generate Proof] <--- Button 3      |
|    --- Revealed Bids (Private to Runner) ---                   |
|    - Bid 1: 5 WETH @ 3050 USDC (Price too low for fill)        |
|    - Bid 2: 3 WETH @ 3100 USDC  (WINNER)                        |
|    - Bid 3: 8 WETH @ 3020 USDC  (WINNER)                        |
|    - Bid 4: 2 WETH @ 2900 USDC  (Loses, price < maker minimum)  |
|    --- ZK Proof ---                                            |
|    Proof Generated: [Yes]                                      |
|    Public Output (Total Fill): [11 WETH]                       |
|    Public Output (Avg Price): [3054.54 USDC]                   |
------------------------------------------------------------------
| 4. On-Chain Settlement via 1inch LOP                           |
|    Status: [Ready to Settle] -> [SUCCESS]                      |
|    [▶️ Step 4: Execute 1inch fillOrder] <--- Button 4           |
|    1inch LOP Tx Hash: [0x...txhash...] (Etherscan Link)         |
|    Final Outcome: Maker received [33,600 USDC] for [11 WETH]   |
------------------------------------------------------------------
```

---

## 📜 **The Master Demo Script (`demo.ts`)**

This is a single off-chain script (e.g., a Hardhat or Foundry script) that controls the entire demo flow. Each function in the script corresponds to a button press on the UI.

### **Setup Phase (Before the Demo Starts)**

This code runs once to prepare the local forked environment.

1.  **Fork the Network:** Start a local Anvil/Hardhat node, forking Arbitrum mainnet from a recent block. `anvil --fork-url <ARBITRUM_RPC_URL>`
2.  **Define Wallets:**
    *   `const makerWallet = new ethers.Wallet(MAKER_PRIVATE_KEY, provider);`
    *   `const runnerWallet = new ethers.Wallet(RUNNER_PRIVATE_KEY, provider);`
3.  **Get Contract ABIs:** Load the ABIs for WETH, USDC, the official 1inch LOP, and all of your `zkFusion` contracts.
4.  **Mint Tokens (Crucial):**
    *   Find a whale address on Arbiscan that holds a large amount of WETH and USDC.
    *   Use `anvil_impersonateAccount` to take control of the whale's wallet.
    *   `whaleSigner.sendTransaction(...)` to transfer `10 WETH` to `makerWallet` and `50,000 USDC` to `runnerWallet`.
    *   This ensures you have the necessary funds for the demo.
5.  **Deploy Your Contracts:**
    *   Deploy `CommitmentFactory.sol`.
    *   Deploy `zkFusionExecutor.sol` (linked to your `Verifier.sol`).
    *   Deploy `ZkFusionGetter.sol` (linked to your executor).

### **Demo Step 1: Create Order & Deploy Contract**

*   **Action:** User clicks "▶️ Step 1" button.
*   **Script Logic (`step1_createOrder` function):**
    1.  **Token Approval:** `makerWallet` calls `WETH.approve(LOP_ADDRESS, amountToSell)`. This is a critical step. The UI should briefly show "Approving WETH spend...".
    2.  **Deploy Commitment Contract:** `runnerWallet` calls `CommitmentFactory.createCommitmentContract()`. This deploys a new `BidCommitment` instance for this specific auction.
    3.  **Log Addresses:** The script logs the new `commitmentContract` address.
    4.  **UI Update:** The frontend updates the status in section 1 to "Auction Live" and displays the contract address with a link to the local block explorer.

### **Demo Step 2: Submit Bid Hashes**

*   **Action:** User clicks "▶️ Step 2".
*   **Script Logic (`step2_submitBids` function):**
    1.  **Simulate Resolvers:** The script defines 4 sample bids (prices, amounts).
    2.  **Generate Hashes:** For each bid, it calculates the `Poseidon` hash off-chain using `circomlibjs`.
    3.  **Commit On-Chain:** The script sends 4 separate on-chain transactions from `runnerWallet` to the `commitmentContract`, calling `submitBid(hash)` for each one.
    4.  **UI Update:** The UI updates in real-time as each transaction confirms, showing the "Bids Committed" count and populating the on-chain hash list.

### **Demo Step 3: Run Auction & Generate Proof**

*   **Action:** User clicks "▶️ Step 3".
*   **Script Logic (`step3_generateProof` function):**
    1.  **Fetch Commitments:** The script calls the `view` function on the `commitmentContract` to get the array of all 8 committed hashes (including nulls for empty slots). This is a crucial step to show you are binding to on-chain state.
    2.  **Run Off-Chain Logic:**
        *   The script runs the Dutch auction algorithm on the 4 revealed bids.
        *   It determines the winners (`Bid 2` and `Bid 3` in the mockup).
    3.  **Prepare Circuit Inputs:** It assembles all private and public inputs for the ZK circuit, including the `commitments` array fetched from the contract.
    4.  **Generate ZK Proof:** It calls `snarkjs.groth16.fullProve(...)` to generate the proof and the public signals (`totalFill`, `weightedAvgPrice`, etc.).
    5.  **UI Update:** The UI instantly updates section 3 with the results, showing the private bid data, the winners, and the public outputs from the proof.

### **Demo Step 4: Execute 1inch `fillOrder`**

*   **Action:** The final, most important click: "▶️ Step 4".
*   **Script Logic (`step4_settleOrder` function):**
    1.  **Craft the Extension:**
        *   This is the most technical part. The script ABI-encodes the ZK proof, public outputs, and the `commitmentContractAddress` into the `extensionData` bytestring.
        *   It then builds the full `getTakingAmount` calldata by prepending the function selector and the `ZkFusionGetter`'s address.
    2.  **Build the 1inch LOP Order:**
        *   **Interaction Point:** Use the **`@1inch/limit-order-protocol-utils` SDK** here.
        *   Call `buildOrder()`, passing in the Maker's details and the complex `extension` object you just crafted.
    3.  **Sign the LOP Order:**
        *   **Interaction Point:** Use the **`@1inch/limit-order-protocol-utils` SDK**.
        *   `makerWallet` signs the complete order structure using `signOrder()`.
    4.  **Token Approval (Runner):** `runnerWallet` calls `USDC.approve(LOP_ADDRESS, finalTakingAmount)`. The runner needs to approve the funds it will pay the maker.
    5.  **Execute the Fill:**
        *   **Interaction Point:** Call the official, deployed **1inch Limit Order Protocol contract** on your local fork.
        *   `runnerWallet` calls `lop.fillOrder(order, signature, ...)`
    .
    6.  **UI Update:** The frontend receives the transaction hash from the script, displays it with an Etherscan link, and shows the final successful settlement message.

This detailed blueprint provides a clear path to a powerful and convincing demo that is both simple to follow and highlights the technical sophistication of `zkFusion`. 