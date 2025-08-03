---
# 🎯 zkFusion Final Action Plan - CRITICAL PIVOT

**Date**: August 2, 2025  
**Status**: Correct Target Identified (`AggregationRouterV6`), `BadSignature` is Primary Blocker
**Priority**: URGENT - ~9 hours to hackathon deadline

---

## 🚨 CURRENT SITUATION: MAJOR CORRECTION

**PREVIOUSLY WRONG ASSUMPTION**: We were targeting a non-existent or incorrect contract.

**NEW GROUND TRUTH**:
- ✅ **The Limit Order Protocol is a FEATURE of the 1inch Aggregation Router, not a separate contract.**
- ✅ **Our correct target is the `1inch: Aggregation Router V6` contract at `0x111111125421ca6dc452d289314280a0f8842a65` on Arbitrum.**
- 🛑 **Our primary blocker is a `BadSignature` error.** This is an EIP-712 signing issue, likely caused by using the wrong domain separator from our previous incorrect target.

---

## 🎯 PHASE 1: FIX `BadSignature` ERROR (URGENT - Next 2-3 hours)

### Priority 1A: Get Correct EIP-712 Domain
**Objective**: Read the `name`, `version`, `chainId`, and `verifyingContract` from the live `AggregationRouterV6` contract.
**Actions**:
- [ ] Write a small script using `ethers.js` to call the `eip712Domain()` view function on the V6 router contract (`...a65`) on our Arbitrum fork.
- [ ] Log the results to get the exact domain parameters required for signing.

### Priority 1B: Verify and Correct the `Order` Struct
**Objective**: Ensure the JavaScript `Order` object in our test exactly matches the Solidity struct in the V6 Router ABI.
**Actions**:
- [ ] Fetch the verified ABI for the V6 router from Arbiscan.
- [ ] Manually compare every field, type, and order of our JS `Order` object against the ABI. Pay close attention to `uint256` vs `address` and `bytes` types.

### Priority 1C: Re-implement Signing Logic & Test
**Objective**: Generate a valid signature and get past the `BadSignature` error.
**Actions**:
- [ ] Update the `signOrder` utility in `test/true-1inch-integration.test.js` to use the correct EIP-712 domain recovered from Priority 1A.
- [ ] Run the test, specifically the `fillOrderArgs` part.
- **SUCCESS CRITERIA**: The test no longer reverts with `BadSignature`. The ideal outcome is a revert with `Not enough allowance`, which proves the signature was accepted.

---

## 🎯 PHASE 2: ACHIEVE SUCCESSFUL `fillOrderArgs` (2-3 hours)

### Priority 2A: Fix Allowance Issues
**Objective**: Ensure the router has the correct token approvals.
**Actions**:
- [ ] The `maker` (e.g., `bidder1`) must approve the `AggregationRouterV6` contract to spend their `makerAsset` (WETH).
- [ ] The `taker` (our `owner` account) must approve the `AggregationRouterV6` contract to spend their `takerAsset` (USDC), if it's involved in the fill.

### Priority 2B: Final `fillOrderArgs` Execution
**Objective**: Execute a successful token swap via our ZK-powered limit order.
**Actions**:
- [ ] Run the full test again.
- **SUCCESS CRITERIA**: The `fillOrderArgs` transaction completes successfully. WETH is transferred from the maker, and USDC is transferred to the maker, with the amounts determined by our `ZkFusionGetter`.

---

## 🎯 PHASE 3: FINALIZE & SUBMIT (4 hours)

### Priority 3A: Assemble Demo
**Objective**: Create a clean, runnable script that demonstrates the full end-to-end flow.
**Actions**:
- [ ] Refactor the working logic from `test/true-1inch-integration.test.js` into the `demo.js` script.
- [ ] Add clear console logs to explain each step of the process for the judges.

### Priority 3B: Record Video & Write Submission
**Objective**: Prepare all hackathon submission materials.
**Actions**:
- [ ] Record a clear screen capture video of the `demo.js` script running successfully.
- [ ] Write up the project description, focusing on our innovative use of ZK proofs to create trustless, off-chain Dutch auctions within the 1inch ecosystem.

---

## ⚡ EMERGENCY FALLBACK

**If Phase 1 (`BadSignature`) takes more than 3 hours:**
- **Pivot:** We will not be able to show a full end-to-end transaction.
- **New Demo:** The demo will consist of:
    1.  Deploying all our contracts.
    2.  Successfully generating the ZK proof.
    3.  Calling `getTakingAmount` on our `ZkFusionGetter` contract.
    4.  **EXPLAINING** that the final `fillOrderArgs` call is blocked by a signature issue, but that the core ZK logic is sound and demonstrated.
- This is not ideal, but it salvages the core innovation of our project.

*Last Updated: August 2, 2025 - Post-Correction & Pivot* 