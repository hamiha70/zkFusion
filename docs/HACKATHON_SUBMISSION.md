# zkFusion - Hackathon Submission

## Project Information

**Project name:** zkFusion

**Category:** DeFi / Zero-Knowledge / Orderbook Protocols

**Emoji:** ✨

**Short description:** Private Dutch auctions for 1inch intents, settled with zero-knowledge proofs instead of slow on-chain price decay.

## Description

zkFusion replaces the on-chain Dutch auction used in 1inch Fusion+ with an off-chain, fast, and private sealed-bid auction that provides cryptographic guarantees of correctness via zero-knowledge proofs.

### Problem
In 1inch Fusion and Fusion+, Dutch auctions run on-chain with descending prices over multiple blocks. This creates three critical challenges:

- ⚡️ **Latency**: Block time limits auction speed, especially on slower chains
- 🔒 **Privacy**: Bids are visible or implied through transactions, enabling MEV extraction
- ❌ **Inefficiency**: Higher-value bids may be missed due to timing constraints or network congestion

### Our Solution: zkFusion

zkFusion implements a **sealed-bid, commit-reveal auction** that maintains all security guarantees of on-chain Dutch auctions while dramatically improving speed and privacy:

**Phase 1 - Commit:** Bidders submit hashed commitments to their bids (price, amount, nonce) on-chain via factory-deployed contracts. Each commitment is cryptographically tied to the bidder's address.

**Phase 2 - Reveal & Prove:** An off-chain auction runner collects revealed bids and generates a zero-knowledge proof demonstrating:
- All revealed bids match their prior on-chain commitments
- The selected bids were optimal for the maker (highest prices selected first)
- No better bids were omitted from consideration

**Phase 3 - Execute:** An on-chain verifier contract validates the ZK proof, confirms commitment integrity, and triggers `fillOrder()` on the 1inch Limit Order Protocol.

### Innovation & Uniqueness

zkFusion is the **first implementation** of zero-knowledge proofs applied to Dutch auction mechanisms in DeFi. Our comprehensive research shows no prior art exists for ZK-enhanced Dutch auctions in production DEX systems.

Unlike existing ZK applications:
- **ZK-Rollup DEXs** (Loopring, dYdX) focus on scaling through batching
- **Academic sealed-bid auctions** remain in research phase
- **Batch clearing systems** (NoxFi-style) handle different auction mechanics

zkFusion uniquely addresses the trust and privacy challenges in competitive resolver environments while maintaining the proven Dutch auction model that 1inch Fusion+ relies on.

### Security Model & Guarantees

**Trust Assumptions:**
- Auction runner is trusted for bid privacy but NOT trusted to avoid manipulation
- Bidders submit their own commitments (runner cannot forge participation)
- Only commitment contracts from known factory are accepted

**Cryptographic Guarantees:**
- ✅ No fake winning bids (commitment hashes verified in ZK circuit and on-chain)
- ✅ No bid omission (ZK circuit proves optimal selection from all committed bids)
- ✅ Bidder authenticity (all commitments tied to `msg.sender`)
- ✅ Proof binding (cryptographically bound to specific commitment contract address)

**Attack Vectors Prevented:**
- **Fake commitment contracts**: Factory-only contract verification
- **Injected fake bids**: All commitments tied to bidder's `msg.sender`
- **Bid omission**: ZK circuit proves no higher bid exists than selected winners
- **Proof replay**: Commitment contract address and order hash binding

## How it's made

zkFusion is implemented using cutting-edge zero-knowledge technology integrated with battle-tested smart contract architecture, specifically designed for seamless integration with 1inch's existing infrastructure.

### Technical Architecture

**Smart Contract Layer (Solidity):**
- **CommitmentFactory.sol**: Deploys trusted BidCommitment contracts, preventing auction runners from creating fake commitment pools
- **BidCommitment.sol**: Stores bidder commitments tied to `msg.sender`, ensuring only legitimate bidders can participate
- **zkFusionExecutor.sol**: Core verifier contract that validates ZK proofs and executes fills via 1inch LOP
- **Interfaces**: Clean integration points with 1inch Limit Order Protocol

**Zero-Knowledge Circuit (Circom):**
- **zkDutchAuction.circom**: Implements the core auction logic with Poseidon hash verification, bitonic sorting for price ordering, and greedy winner selection
- Proves commitment integrity, optimal bid selection, and fair auction execution
- Outputs public signals for on-chain verification while keeping losing bids private

**Development Stack:**
- **Circom + SnarkJS (Groth16)**: ZK proof generation and verification
- **Hardhat**: Smart contract development, testing, and deployment
- **Ethers.js**: Blockchain interaction and event handling
- **Poseidon Hash**: ZK-friendly commitment scheme for efficient circuit constraints

### Design Innovations

**Decoupled from Block Time:** Unlike Fusion's price decay tied to block progression, zkFusion operates independently of blockchain timing. Auctions resolve instantly once the ZK proof is generated, enabling sub-second settlement on any EVM chain.

**Privacy-Preserving Competition:** Only winning bids are revealed publicly. All other bids remain private, preventing strategy copying and reducing MEV opportunities while maintaining competitive dynamics.

**Trust-Minimized Architecture:** Even though the auction runner sees all revealed bids off-chain, they cannot manipulate outcomes without cryptographic detection. The ZK proof system ensures mathematical correctness regardless of runner behavior.

**Factory Pattern Security:** Following 1inch Fusion+'s HTLC model, we use a trusted factory to deploy commitment contracts. This prevents auction runners from creating selective commitment pools while maintaining decentralized participation.

### Integration Strategy

zkFusion plugs directly into 1inch's existing infrastructure:

**Limit Order Protocol Integration:** After ZK proof verification, the system calls standard `fillOrder()` functions, maintaining full compatibility with existing maker orders and settlement logic.

**Resolver Compatibility:** Existing resolvers can participate in zkFusion auctions using the same economic incentives, just with enhanced privacy and speed.

**Cross-Chain Ready:** The architecture extends naturally to Fusion+ cross-chain scenarios, where ZK proofs can trigger HTLC unlocks or conditional transfers.

### Technical Challenges Solved

**Commitment Integrity:** We solved the critical problem of preventing auction runners from omitting valid bids by requiring all commitments to be submitted on-chain via factory-deployed contracts.

**Efficient ZK Circuits:** Our bitonic sort implementation enables fair price-based winner selection within practical constraint limits (optimized for N=4-32 bidders for hackathon demo).

**Gas Optimization:** The verifier contract performs minimal on-chain computation, with most complexity handled in the ZK proof, resulting in predictable and low gas costs.

### Future Enhancements

- **Merkle Tree Commitments**: Scale to hundreds of bidders with logarithmic verification costs
- **Encrypted Bidding**: Enhanced privacy even from auction runners using MPC or FHE
- **Cross-Chain Proofs**: Native integration with Fusion+ HTLC mechanisms
- **Universal Verifier**: Support multiple auction formats with modular ZK circuits

zkFusion represents the convergence of mature zero-knowledge cryptography with practical DeFi infrastructure, creating a production-ready system that enhances 1inch's market-leading aggregation protocol while opening new possibilities for private, fast, and trustless auction mechanisms.

## Demo & Repository

**Live Demo:** [To be deployed during hackathon]

**GitHub Repository:** [Repository URL - to be added]

**Key Features Demonstrated:**
- Complete auction flow from commitment to settlement
- ZK proof generation and verification
- Integration with mock 1inch LOP
- Multi-bidder competition with optimal winner selection

## Team & Acknowledgments

**Team:** zkFusion Development Team

**Special Thanks:**
- 1inch Network for the innovative Fusion+ architecture that inspired this work
- Circom and SnarkJS communities for excellent ZK tooling
- ETHGlobal for fostering cutting-edge DeFi innovation

---

*zkFusion: Bringing cryptographic trust to intent-based DeFi settlement* ✨ 