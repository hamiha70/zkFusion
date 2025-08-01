# 1inch LOP & Fusion Integration: Analysis & Demo Insights

**Date:** August 1, 2025
**Status:** Research Complete, High-Confidence Implementation Plan Defined

## 1. Executive Summary

This document details the systematic analysis of the 1inch Limit Order Protocol (LOP), the Fusion Dutch Auction extension, and the corresponding SDKs. The goal was to de-risk the integration of our `zkFusion` protocol and create a validated, code-backed implementation plan for the hackathon demo.

**The analysis was successful.** We have a clear, step-by-step path to integration that is based on the actual on-chain mechanics and SDK implementations, not potentially outdated documentation.

---

## 2. Part 1: Analysis of 1inch Protocol Components

### A. `DutchAuctionCalculator.sol` (The On-Chain Blueprint)
- **Location:** `limit-order-protocol/contracts/extensions/DutchAuctionCalculator.sol`
- **Purpose:** This contract is the official reference implementation for a dynamic-rate order. It's the contract our `ZkFusionGetter.sol` will replace.
- **Key Insight:** It implements the `IAmountGetter` interface, specifically the `getTakingAmount` function. Crucially, it **ignores the `Order.extension` field** and instead reads its simple configuration (start/end times and prices) from the `extraData` parameter. This is a significant finding, as it means the `extension` field is available for more complex logic like ours.

### B. `ResolverExample.sol` (The On-Chain Orchestrator)
- **Location:** `fusion-resolver-example/contracts/ResolverExample.sol`
- **Purpose:** This contract demonstrates the pattern for how a "resolver" (our "Auction Runner") executes a fill.
- **Key Insight:** The resolver EOA does **not** call the 1inch LOP directly. Instead, it calls a function on its own deployed contract (`settleOrders`). This contract then performs its logic and executes the LOP fill via a low-level `call`. This provides atomicity. This validates our architecture of using `zkFusionExecutor.sol` as the main entry point for a fill, which will first verify the ZK proof and then call the LOP.

### C. `limit-order-sdk` (The Off-Chain Toolkit)
- **Location:** `limit-order-sdk/src/limit-order/`
- **`LimitOrder.ts`:**
    - **Purpose:** The core class for building and signing orders off-chain.
    - **Key Insight:** The constructor accepts an `Extension` object. If an extension is provided, the SDK uses `LimitOrder.buildSalt(extension)` to create a deterministic salt. This function hashes the extension data and embeds it in the salt, **cryptographically binding the order to our specific ZK logic**. This is a critical security feature we must use.
- **`extension.ts`:**
    - **Purpose:** A class for constructing the complex `Order.extension` bytestring.
    - **Key Insight:** It contains a property named `takingAmountData`. This is the designated field for passing calldata to a custom getter contract. The LOP contract reads this field, takes the **first 20 bytes as the getter's address**, and passes the **remaining bytes as calldata**. This confirms how we will pass our proof data, and that there is no size limit beyond standard block limits.

### D. On-Chain Deployments & Fork Target
- **Research Result:** The LOP v4 contract is deployed to the same address on most major chains: `0x111111125421ca6dc452d289314280a0f8842a65`.
- **Conclusion:** **Arbitrum One** is the ideal network to fork for the demo, as it is highly active and we have the verified contract address.

---

## 3. Part 2: Implications for zkFusion Implementation

Based on the analysis, we have a clear, validated plan.

### A. On-Chain Implementation
- **`ZkFusionGetter.sol`:**
    - Must implement the `getTakingAmount(Order, extension, ...)` function signature.
    - It will receive the `extension` bytestring from the LOP.
    - It must be designed to decode its calldata (`proof`, `publicSignals`, `commitmentContractAddress`) from this bytestring.
- **`zkFusionExecutor.sol`:**
    - This contract is our primary on-chain entry point for the Auction Runner.
    - It will have a main function like `executeZkFusionFill(...)`.
    - This function will take the signed LOP order and our ZK proof data as input.
    - **Logic:**
        1. Call `Verifier.sol` to verify the ZK proof.
        2. If verification succeeds, construct the `fillOrder` calldata.
        3. Execute the fill by making a low-level `call` to the 1inch LOP contract, just like the `ResolverExample`.

### B. Off-Chain Implementation (`demo.ts`)
- **SDK Usage:** We must use the `@1inch/limit-order-sdk`.
- **Building the Extension (The Core Task):**
    ```typescript
    // 1. ABI-encode our ZK proof data and other inputs
    const proofData = AbiCoder.defaultAbiCoder().encode(
        ['tuple(uint256[2],uint256[2][2],uint256[2])', 'uint256[3]', 'address'],
        [proof, publicSignals, commitmentContractAddress]
    );

    // 2. Prepend our deployed ZkFusionGetter's address (the "20-byte" component)
    const takingAmountData = ZK_FUSION_GETTER_ADDRESS + trim0x(proofData);

    // 3. Create the final Extension object
    const extension = new Extension({
        ...Extension.EMPTY,
        takingAmountData: takingAmountData
    });
    ```
- **Building the Order:**
    - The `extension` object is passed into the `LimitOrder` constructor.
    - The SDK will automatically handle the critical step of creating the correct, extension-bound `salt`.
- **Executing the Fill:**
    - The `demo.ts` script will call `zkFusionExecutor.executeZkFusionFill(...)`, not the LOP directly.

---

## 4. Part 3: Concept Correspondence Table

| zkFusion Concept | 1inch Protocol Equivalent | File Reference |
|---|---|---|
| `zkFusionExecutor.sol` | On-chain Resolver Logic | `ResolverExample.sol` |
| `ZkFusionGetter.sol` | Custom Amount Calculator | `DutchAuctionCalculator.sol` |
| `demo.ts` (Auction Runner) | Off-chain Resolver Script | `fusion-resolver-example/test/*` |
| Proof + Public Inputs | Custom Getter Calldata | `Extension.takingAmountData` |
| Cryptographic Binding | Extension-based Salt | `LimitOrder.buildSalt()` |
| Final Settlement Call | `lop.fillOrder(...)` | `LimitOrderProtocol.sol` |

---

## 5. Critical Clarification: Why We Only Implement `getTakingAmount`

This analysis confirms that for our specific demo flow, we only need to implement the `getTakingAmount` function in our `ZkFusionGetter.sol`. This is a deliberate design choice, not an omission.

### The Two Sides of a Limit Order

The 1inch LOP is built for two primary user stories:
1.  **Maker wants to SELL a fixed `makingAmount`**: "I have 10 WETH to sell. Calculate the price in USDC (`takingAmount`) I will receive." This requires the `getTakingAmount` function.
2.  **Maker wants to BUY with a fixed `takingAmount`**: "I have 30,000 USDC to spend. Calculate how much WETH (`makingAmount`) I will receive." This requires the `getMakingAmount` function.

### Our Demo's User Story

Our demo is explicitly about the **first case**.
- The **Maker** creates and signs the limit order, which is the "request to sell".
- Their `makingAmount` (e.g., 10 WETH) is the known quantity.
- Our **ZK-powered Dutch Auction** is the mechanism to discover the price.
- The `takingAmount` (the final USDC price) is the variable that our system calculates.

When our `zkFusionExecutor` fills the order, the 1inch LOP contract needs to determine this final price. It does so by calling the getter specified in the order's `extension`. Since the `takingAmount` is what needs to be calculated, the LOP correctly calls our `ZkFusionGetter.getTakingAmount` function.

**Conclusion:** Focusing solely on `getTakingAmount` is the precise and correct implementation for our demo's narrative. It directly replaces the functionality of the standard `DutchAuctionCalculator` for a sell-side order. 