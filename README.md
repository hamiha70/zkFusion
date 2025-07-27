# zkFusion ✨

**ZK-powered Dutch auctions for fast, private, provable intent settlement**

zkFusion replaces the on-chain Dutch auction used in 1inch Fusion+ with an off-chain, fast, and private sealed-bid auction that provides cryptographic guarantees of correctness via zero-knowledge proofs.

## 🎯 Problem Statement

In 1inch Fusion and Fusion+, Dutch auctions run on-chain with descending prices over multiple blocks. This creates:

- ⚡️ **Latency**: Block time limits auction speed
- 🔒 **Privacy**: Bids are visible or implied through transactions  
- ❌ **Inefficiency**: Higher-value bids may be missed due to timing

## 💡 Solution: zkFusion

zkFusion implements a **sealed-bid, commit-reveal auction** that:

✅ **Bidders** submit hashed commitments to bids (price, amount, nonce) on-chain via factory-deployed contracts

✅ **Auction runner** collects revealed bids off-chain and selects optimal fills

✅ **ZK proof** generated proving:
- All revealed bids match prior commitments
- Selected bids were optimal for the maker
- No better bids were omitted

✅ **On-chain verifier** validates proof and triggers `fillOrder()` on 1inch LOP

## 🏗️ Architecture

```
Maker Intent → Factory Creates Commitment Contract
     ↓
Bidders Submit Commitments (on-chain)
     ↓  
Bidders Reveal Bids (off-chain to runner)
     ↓
ZK Circuit Proves Fair Selection
     ↓
Verifier Contract Validates + Executes Fill
```

### Core Components

1. **CommitmentFactory.sol** - Deploys trusted BidCommitment contracts
2. **BidCommitment.sol** - Stores bidder commitments tied to `msg.sender`
3. **zkFusionExecutor.sol** - Verifies proofs and executes LOP fills
4. **zkDutchAuction.circom** - ZK circuit proving auction correctness

## 🔐 Security Model

### Trust Assumptions
- **Auction runner**: Trusted for bid privacy, NOT trusted to avoid manipulation
- **Bidders**: Submit own commitments (runner cannot forge)
- **Factory**: Only contracts from known factory are accepted

### Guarantees
✅ No fake winning bids (commitment hash verified)  
✅ No bid omission (ZK proves optimal selection)  
✅ Bidder authenticity (tied to `msg.sender`)  
✅ Proof binding (cryptographically bound to specific commitment contract)

### Attack Vectors Prevented
| Attack | Defense |
|--------|---------|
| Fake commitment contracts | Factory-only contract verification |
| Injected fake bids | All commitments tied to `msg.sender` |
| Bid omission | ZK circuit proves no higher bid exists |
| Proof replay | Commitment contract + order hash binding |

## 🛠️ Technical Stack

- **Circom + SnarkJS (Groth16)** - ZK proof generation
- **Solidity** - Smart contracts  
- **Hardhat** - Development framework
- **1inch Limit Order Protocol** - Order execution integration
- **Poseidon Hash** - ZK-friendly commitment scheme

## 🚀 Quick Start

### Prerequisites
```bash
npm install -g circom snarkjs
npm install
```

### Deploy Contracts
```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network polygon
```

### Generate ZK Proof
```bash
cd circuits
circom zkDutchAuction.circom --r1cs --wasm --sym
snarkjs groth16 setup zkDutchAuction.r1cs pot12_final.ptau circuit_final.zkey
```

### Run Example Auction
```bash
npx hardhat run scripts/example-auction.js
```

## 📁 Project Structure

```
zkFusion/
├── contracts/
│   ├── CommitmentFactory.sol
│   ├── BidCommitment.sol  
│   ├── zkFusionExecutor.sol
│   ├── Verifier.sol (auto-generated)
│   └── interfaces/
├── circuits/
│   ├── zkDutchAuction.circom
│   └── utils/
├── scripts/
│   ├── deploy.js
│   ├── generate-proof.js
│   └── example-auction.js
├── test/
└── docs/
```

## 🔮 Future Enhancements

- 🌲 **Merkle tree commitments** for scaling to 100+ bidders
- 🔐 **Encrypted bid commitments** for privacy from auction runner  
- 🌐 **Cross-chain HTLC integration** (zkFusion+)
- 📦 **Universal proof verifier** for multiple auction formats
- 🎯 **UI for commitment & bidding** workflow

## 🏆 Innovation & Uniqueness

zkFusion is the **first implementation** of zero-knowledge proofs applied to Dutch auction mechanisms in DeFi. Unlike existing ZK applications in:

- **ZK-Rollup DEXs** (scaling focus) - we target auction mechanism integrity
- **Sealed-bid auctions** (academic) - we address live production systems  
- **Batch clearing** (NoxFi-style) - we handle competitive resolver dynamics

This represents a novel convergence of mature ZK techniques with an underexplored application domain.

## 📊 Comparison to State of Art

| Project | Auction Type | Privacy | Production Ready | ZK Focus |
|---------|--------------|---------|------------------|----------|
| zkFusion | Dutch (descending) | Losing bids hidden | 1inch integration | Auction fairness |
| NoxFi | Batch clearing | All orders hidden | Prototype | Order privacy |
| Academic schemes | Sealed-bid | Full privacy | Research only | Bid confidentiality |
| 1inch Fusion | Dutch (on-chain) | No privacy | Production | No ZK |

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Links

- [1inch Fusion Documentation](https://help.1inch.io/en/articles/5435301-fusion-mode)
- [Circom Documentation](https://docs.circom.io/)
- [ETHGlobal Unite Hackathon](https://ethglobal.com/events/unite)

---

*zkFusion: Bringing cryptographic trust to intent-based DeFi settlement* ✨
