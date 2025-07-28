# zkFusion Auction Flow - Complete Design Document

**Version**: 1.0  
**Date**: January 2025  
**Status**: Production Design (Option A Implementation)

---

## 🎯 **EXECUTIVE SUMMARY**

zkFusion implements a **privacy-preserving Dutch auction system** that accelerates 1inch Fusion+ order execution through off-chain computation with zero-knowledge proof verification. This document defines the complete flow from intent creation to settlement.

---

## 👥 **ACTOR DEFINITIONS**

### **Maker** 
- **Role**: Order creator seeking to trade assets
- **Equivalent**: User in 1inch Fusion+ diagram
- **Actions**: Creates trading intent, signs limit order, receives settlement
- **Trust Model**: Trusts system to execute at fair market price

### **Bidder/Resolver** 
- **Role**: Liquidity provider competing to fill orders
- **Equivalent**: Resolver in 1inch Fusion+ system
- **Actions**: Submits private bid commitments, reveals bids, provides liquidity
- **Trust Model**: Trusts auction fairness, privacy of losing bids

### **Auction Runner** 
- **Role**: Off-chain coordinator executing Dutch auction logic
- **Equivalent**: Enhanced Fusion+ resolver with ZK capabilities
- **Actions**: Collects bids, runs auction algorithm, generates ZK proofs
- **Trust Model**: Cryptographically constrained by ZK proofs and on-chain commitments

### **Commitment Contract**
- **Role**: On-chain bid commitment registry
- **Equivalent**: Enhanced limit order protocol with privacy layer
- **Actions**: Accepts bid commitments, manages auction lifecycle, enforces rules
- **Trust Model**: Trustless smart contract execution

---

## 🌊 **COMPLETE AUCTION FLOW**

### **PHASE 1: INTENT CREATION & SETUP**

#### **1.1 Maker Creates Trading Intent**
- **Location**: Off-chain (Maker's wallet/interface)
- **Action**: Maker decides to trade TokenA → TokenB
- **Technical**: 
  - Maker signs 1inch LOP v4 order structure
  - Order includes: maker asset, taker asset, amounts, expiry, receiver
  - Order signature ready for settlement

#### **1.2 Auction Initialization**
- **Location**: On-chain (CommitmentFactory)
- **Trigger**: Maker or Auction Runner calls `createAuction()`
- **Technical**:
  ```solidity
  function createAuction(
    bytes32 orderHash,
    uint256 maxBidders,  // N=8 for hackathon
    uint256 auctionDuration
  ) returns (address commitmentContract)
  ```
- **Events**: `AuctionCreated(orderHash, commitmentContract, maxBidders)`
- **State**: CommitmentContract deployed in `BIDDING_OPEN` state

---

### **PHASE 2: BID COLLECTION (COMMIT PHASE)**

#### **2.1 Bidder Discovery & Intent Broadcasting**
- **Location**: Off-chain (Intent propagation network)
- **Mechanism**: **[DESIGN CHOICE NEEDED]**
  - **Option A**: WebSocket broadcast to registered resolvers
  - **Option B**: Event-based discovery (bidders watch for `AuctionCreated`)
  - **Option C**: Script-driven for hackathon demo
- **Data Shared**: Order details, commitment contract address, auction parameters

#### **2.2 Bidder Bid Preparation**
- **Location**: Off-chain (Bidder's system)
- **Process**:
  1. Bidder analyzes order (TokenA amount, desired TokenB amount)
  2. Bidder calculates competitive bid: `(price_per_token, fill_amount)`
  3. Bidder generates random nonce for privacy
  4. Bidder computes commitment: `commitment = Poseidon(price, amount, nonce)`

#### **2.3 Bid Commitment Submission**
- **Location**: On-chain (CommitmentContract)
- **Trigger**: Bidder calls `submitBid(commitment)`
- **Technical**:
  ```solidity
  function submitBid(uint256 commitment) external {
    require(state == BIDDING_OPEN, "Bidding closed");
    require(bidCount < maxBidders, "Auction full");
    
    // Overwrite pre-populated Poseidon(0,0,0) commitment
    bids[bidCount] = Bid({
      commitment: commitment,
      bidder: msg.sender,
      timestamp: block.timestamp
    });
    bidCount++;
    
    if (bidCount == maxBidders) {
      state = AUCTION_FULL;
      emit AuctionFull(bidCount);
    } else {
      emit BidSubmitted(msg.sender, commitment, bidCount-1);
    }
  }
  ```

#### **2.4 Null Commitment Pre-Population**
- **Location**: On-chain (CommitmentContract constructor)
- **Purpose**: Initialize all slots with `Poseidon(0,0,0)` for uniform ZK verification
- **Technical**:
  ```solidity
  constructor(bytes32 _orderHash, uint256 _maxBidders) {
    orderHash = _orderHash;
    maxBidders = _maxBidders;
    state = AuctionState.BIDDING_OPEN;
    
    // Pre-populate all slots with null commitment hash
    uint256 nullCommitment = poseidon([0, 0, 0]); // Poseidon(0,0,0)
    for (uint256 i = 0; i < _maxBidders; i++) {
      bids[i] = Bid({
        commitment: nullCommitment,
        bidder: address(0),
        timestamp: 0
      });
    }
  }
  ```

**✅ Benefits of Poseidon(0,0,0) Approach:**
- **Uniform ZK Verification**: No case distinctions in circuit - all slots verify against proper commitments
- **Circuit Simplification**: Single verification loop handles both real and null bids seamlessly
- **Gas Efficiency**: Pre-computation at contract creation vs. runtime checks
- **Security**: Consistent cryptographic treatment of all bid slots

#### **2.4 Auction State Management**
- **Auto-Lock at Capacity**: When `bidCount == N`, state → `AUCTION_FULL`
- **Manual Lock**: Auction Runner can call `lockAuction()` if `bidCount > 0`
- **Failure Handling**: If `bidCount == 0` after timeout, state → `AUCTION_FAILED`

---

### **PHASE 3: BID REVELATION & AUCTION EXECUTION (REVEAL PHASE)**

#### **3.1 Bid Collection by Auction Runner**
- **Location**: Off-chain (Auction Runner system)
- **Mechanism**: **[DESIGN CHOICE NEEDED]**
  - **Option A**: Bidders push revealed bids via WebSocket/API
  - **Option B**: Auction Runner requests bids from each bidder
  - **Option C**: Script-driven for hackathon (simulate with test data)
- **Data Received**: `(price, amount, nonce, bidder_address)` for each bid
- **Validation**: Runner verifies `Poseidon(price, amount, nonce) == on_chain_commitment`

#### **3.2 Off-Chain Dutch Auction Execution**
- **Location**: Off-chain (Auction Runner)
- **Algorithm**:
  ```javascript
  // 1. Sort bids by price (descending)
  const sortedBids = bids.sort((a, b) => b.price - a.price);
  
  // 2. Greedy fill up to maker's ask amount
  let totalFilled = 0;
  let winners = [];
  for (const bid of sortedBids) {
    if (totalFilled + bid.amount <= makerAsk) {
      winners.push(bid);
      totalFilled += bid.amount;
    }
  }
  
  // 3. Calculate weighted average price
  const totalValue = winners.reduce((sum, bid) => sum + (bid.price * bid.amount), 0);
  const avgPrice = totalValue / totalFilled;
  ```

#### **3.3 ZK Proof Generation**
- **Location**: Off-chain (Auction Runner)
- **Process**:
  1. **Prepare Circuit Inputs**:
     ```javascript
     const circuitInputs = {
       // Private inputs (all 8 slots, padded with nulls)
       bidPrices: [1200n, 1150n, 1100n, 0n, 0n, 0n, 0n, 0n],
       bidAmounts: [100n, 150n, 200n, 0n, 0n, 0n, 0n, 0n],
       nonces: [n1, n2, n3, 0n, 0n, 0n, 0n, 0n],
       
       // Sorting proof
       sortedPrices: [1200n, 1150n, 1100n, 0n, 0n, 0n, 0n, 0n],
       sortedAmounts: [100n, 150n, 200n, 0n, 0n, 0n, 0n, 0n],
       sortedIndices: [0, 1, 2, 3, 4, 5, 6, 7],
       
               // Public inputs (pre-populated with Poseidon(0,0,0) for empty slots)
        commitments: [c1, c2, c3, nullHash, nullHash, nullHash, nullHash, nullHash],
       makerAsk: 400n,
       commitmentContractAddress: contractAddr
     };
     ```
  2. **Generate Witness**: Compute witness using `zkDutchAuction8.wasm`
  3. **Create Proof**: Generate Groth16 proof using `circuit_final.zkey`
  4. **Extract Public Signals**: `[totalFill, weightedAvgPrice, numWinners]`

---

### **PHASE 4: ON-CHAIN SETTLEMENT & VERIFICATION**

#### **4.1 ZK Proof Submission & Verification**
- **Location**: On-chain (zkFusionExecutor)
- **Trigger**: Auction Runner calls `executeWithProof()`
- **Technical**:
  ```solidity
  function executeWithProof(
    uint[8] calldata proof,           // Groth16 proof
    uint[6] calldata publicInputs,    // Circuit public inputs
    address[] calldata winners,       // Winner addresses
    address commitmentContractAddress,
    ILimitOrderProtocol.Order calldata order,
    bytes calldata orderSignature
  ) external {
    // 1. Verify ZK proof
    require(verifier.verifyProof(proof, publicInputs), "Invalid ZK proof");
    
    // 2. Verify commitment contract binding
    require(factory.isValidCommitmentContract(commitmentContractAddress), "Invalid contract");
    require(uint160(commitmentContractAddress) == publicInputs[5], "Contract mismatch");
    
    // 3. Execute 1inch LOP fill
    _executeFill(publicInputs, winners, order, orderSignature);
  }
  ```

#### **4.2 1inch LOP Integration & Settlement**
- **Location**: On-chain (1inch Limit Order Protocol)
- **Process**:
  1. **Order Validation**: Verify order signature and parameters
  2. **Fill Execution**: Call `lop.fillContractOrder(order, signature, amount, takerTraits)`
  3. **Asset Transfer**: 
     - Maker receives TokenB (aggregated from winners)
     - Winners receive TokenA (proportional to their winning bids)
  4. **Event Emission**: `AuctionExecuted(orderHash, totalFill, avgPrice, winners)`

#### **4.3 Final State Updates**
- **CommitmentContract**: State → `AUCTION_COMPLETED`
- **Event Log**: Complete audit trail of auction execution
- **Privacy Preservation**: Losing bids never revealed on-chain

---

## 🔄 **EDGE CASE FLOWS**

### **Scenario A: Insufficient Bids (bidCount < N)**
```
1. Bidding period expires with bidCount = 3
2. Auction Runner calls lockAuction()
3. Contract state → LOCKED, emit AuctionLocked(3)
4. Auction proceeds with 3 real bids + 5 null bids
5. ZK circuit handles null bids (price=0, never win)
6. Settlement proceeds normally
```

### **Scenario B: No Bids Received**
```
1. Bidding period expires with bidCount = 0
2. Contract state → AUCTION_FAILED
3. Event: AuctionFailed("NO_BIDS")
4. Maker's order remains unfilled
5. Optional: Maker can create new auction with different parameters
```

### **Scenario C: Auction Runner Misbehavior**
```
1. Runner submits invalid ZK proof
2. On-chain verification fails: "Invalid ZK proof"
3. Transaction reverts, no settlement occurs
4. Alternative runner can attempt with correct proof
5. Cryptographic constraints prevent manipulation
```

### **Scenario D: Partial Fill Scenarios**
```
1. Total bid amounts < maker's ask
2. All valid bids become winners
3. Maker receives partial fill
4. ZK proof validates partial fill is optimal
5. Settlement proceeds with available liquidity
```

---

## 🔧 **TECHNICAL INTEGRATION POINTS**

### **Data Flow: Off-Chain ↔ On-Chain**
- **On-Chain → Off-Chain**: Event logs, commitment data, auction parameters
- **Off-Chain → On-Chain**: ZK proofs, winner lists, settlement transactions
- **Privacy Boundary**: Losing bid details never cross to on-chain

### **Trust Boundaries**
- **Cryptographic**: ZK proofs ensure auction correctness
- **Economic**: 1inch LOP ensures settlement atomicity  
- **Operational**: Auction Runner trusted for liveness, not correctness

### **Integration with 1inch Ecosystem**
- **LOP Compatibility**: Uses standard 1inch order format
- **Resolver Enhancement**: Auction Runner acts as enhanced resolver
- **SDK Integration**: Can leverage 1inch utilities for order creation

---

## 🎯 **HACKATHON IMPLEMENTATION STRATEGY**

### **Simplified Data Exchange (Script-Driven)** ✅ **SELECTED**
- **Bid Revelation**: Simulate via script-generated test data
- **Network Communication**: File-based or direct function calls  
- **Demo Flow**: Automated scripts trigger each phase sequentially
- **Null Commitments**: Pre-populated with `Poseidon(0,0,0)` for uniform ZK verification

### **Production Evolution Path**
- **Phase 1**: WebSocket-based bid collection
- **Phase 2**: Decentralized intent propagation (Gossip, IPFS)
- **Phase 3**: MPC-based bid privacy (eliminate Auction Runner trust)
- **Phase 4**: Cross-chain HTLC integration (full Fusion+ compatibility)

---

## ❓ **UNRESOLVED DESIGN CHOICES**

### **Critical for Implementation** ✅ **RESOLVED**
1. **Bid Revelation Mechanism**: ✅ **Script-driven for hackathon demo**
2. **Null Commitment Encoding**: ✅ **`commitment = Poseidon(0,0,0)` for uniform circuit verification**
3. **Auction Runner Selection**: Single trusted (hackathon), competitive (production)
4. **Timeout Handling**: Manual triggers (hackathon), block-based (production)

### **Future Considerations**
1. **MEV Protection**: How to prevent frontrunning of ZK proof submission
2. **Cross-Chain Coordination**: HTLC integration for Fusion+ compatibility
3. **Scalability**: Dynamic N sizing vs. Fixed circuit sizes
4. **Decentralization**: Path to eliminate trusted Auction Runner

---

## 🎉 **SUCCESS METRICS**

### **Hackathon Demo Success**
- ✅ Complete flow execution: Intent → Bids → Auction → Settlement
- ✅ ZK proof generation and verification working
- ✅ 1inch LOP integration functional
- ✅ Privacy preservation demonstrated (losing bids not revealed)

### **Production Readiness Indicators**
- ✅ Edge case handling (0 bids, partial fills, failures)
- ✅ Event-driven architecture for real-time coordination
- ✅ Gas optimization for mainnet deployment
- ✅ Security audit readiness

---

**This document serves as the definitive specification for zkFusion architecture and will be updated as design choices are resolved and implementation progresses.** 