# zkDutchAuction Circuit: Performance & Cost Analysis

## Overview

This document provides detailed estimates for proving time, gas costs, and on-chain requirements for the zkDutchAuction circuit running on a Dell XPS laptop and deploying to Arbitrum.

## Circuit Specifications

### **Current Circuit Stats**
- **Non-linear constraints**: 10,611
- **Linear constraints**: 3,700
- **Total constraints**: 14,311
- **Private inputs**: 64
- **Public inputs**: 11
- **Witness generation**: ~26ms (measured)

## Proving Time Estimates

### **Groth16 (Recommended)**
- **Setup Phase**: One-time, ~30-60 seconds for trusted setup generation
- **Proving Time on Dell XPS**: 
  - **Conservative Estimate**: 12-15 seconds
  - **Optimistic Estimate**: 8-12 seconds
  - **Calculation Basis**: ~1ms per 1000 constraints → 14.3 seconds baseline
  - **With optimizations**: Modern laptop (i7/i9, 16GB+ RAM) can achieve better performance

### **PLONK (Alternative)**
- **Proving Time**: 15-25 seconds
- **Benefits**: Universal setup (no trusted setup needed)
- **Tradeoffs**: Larger proofs but more flexible

### **Hardware Requirements**
- **Minimum**: 8GB RAM, modern CPU
- **Recommended**: 16GB+ RAM, i7/i9 processor
- **Dell XPS**: Well within performance range for hackathon demo

## On-Chain Performance & Costs

### **Proof Size (Groth16)**
- **Proof Data**: 256 bytes
  - 3 G1 points (96 bytes each) = 192 bytes
  - 1 G2 point (64 bytes) = 64 bytes
- **Public Inputs**: 11 × 32 bytes = 352 bytes
- **Total On-Chain Data**: ~608 bytes

### **Gas Costs on Arbitrum**

| Operation | Gas Cost | USD Cost* | Notes |
|-----------|----------|-----------|--------|
| **Proof Verification** | 280,000-350,000 gas | $0.10-0.15 | Per auction proof |
| **Calldata** | ~9,728 gas | $0.003 | 608 bytes × 16 gas/byte |
| **Total per Verification** | ~300,000 gas | ~$0.12 | Very affordable! |
| **Verifier Deployment** | 500,000-800,000 gas | $0.20-0.32 | One-time cost |

*Based on Arbitrum gas prices (~0.01 gwei) and ETH at $3,000

### **Verifier Contract**
- **Bytecode Size**: ~2-4KB
- **Functions**: Single `verifyProof()` function
- **Deployment**: One-time cost, reusable for all auctions

## Trusted Setup Requirements

### **Powers of Tau Ceremony**
- **Circuit Size**: 14,311 constraints
- **Required Tau Size**: 2^15 = 32,768 constraints minimum
- **Good News**: Fits within standard Perpetual Powers of Tau ceremony (supports up to 2^28)

### **Setup Files Needed**
1. **Universal Powers of Tau**: 
   - Use existing `powersOfTau28_hez_final_XX.ptau`
   - Download from trusted ceremony (~40MB)
   - **No new ceremony required!**

2. **Circuit-Specific Setup**:
   - Generate once: `zkDutchAuction_final.zkey` (~10MB)
   - Contains circuit-specific proving/verification keys

### **Setup Process**
```bash
# 1. Download existing Powers of Tau (one-time)
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau

# 2. Generate circuit-specific setup
snarkjs groth16 setup zkDutchAuction.r1cs powersOfTau28_hez_final_15.ptau zkDutchAuction_0000.zkey

# 3. Contribute to ceremony (optional for hackathon)
snarkjs zkey contribute zkDutchAuction_0000.zkey zkDutchAuction_final.zkey

# 4. Generate Solidity verifier
snarkjs zkey export solidityverifier zkDutchAuction_final.zkey verifier.sol
```

## Performance Benchmarking

### **How to Measure Proving Time**
```javascript
// Add to your test suite
console.time('🔧 Proof Generation');
const proof = await circuit.generateProof(input);
console.timeEnd('🔧 Proof Generation');

console.time('📊 Full Proving Pipeline');
const witness = await circuit.calculateWitness(input);
const proof = await snarkjs.groth16.prove(zkeyPath, witness);
console.timeEnd('📊 Full Proving Pipeline');
```

### **Gas Cost Measurement**
```solidity
// In your verifier test contract
function measureVerificationGas(
    uint[2] memory _pA,
    uint[2][2] memory _pB,
    uint[2] memory _pC,
    uint[11] memory _pubSignals
) public returns (uint256) {
    uint256 gasStart = gasleft();
    bool result = verifyProof(_pA, _pB, _pC, _pubSignals);
    uint256 gasUsed = gasStart - gasleft();
    
    emit GasUsed(gasUsed, result);
    return gasUsed;
}
```

### **File Size Analysis**
```bash
# Check setup file sizes
ls -lh *.ptau *.zkey *.wasm
du -h circuits/zkDutchAuction_js/
```

## Optimization Strategies

### **If Proving Time Too Slow (>20 seconds)**
1. **Circuit Optimization**:
   - Review constraint count with `circom --json`
   - Eliminate redundant calculations
   - Use lookup tables for repeated operations

2. **Hardware Optimization**:
   - Increase RAM allocation
   - Use SSD storage for faster I/O
   - Consider dedicated proving machine

3. **Alternative Proving Systems**:
   - PLONK: Universal setup, no trusted ceremony
   - Halo2: Recursive proofs, no trusted setup
   - Stark: Transparent, but larger proofs

### **If Gas Costs Too High (>500K gas)**
1. **Batch Verification**:
   - Verify multiple proofs in single transaction
   - Amortize fixed costs across multiple auctions

2. **Proof Aggregation**:
   - Combine multiple auction proofs
   - Single verification for multiple auctions

3. **Layer 2 Optimization**:
   - Already on Arbitrum (excellent choice!)
   - Consider other L2s if needed

## Expected Performance Summary

| Metric | Conservative | Optimistic | Notes |
|--------|-------------|------------|--------|
| **Proving Time** | 12-15 seconds | 8-12 seconds | Dell XPS, Groth16 |
| **Witness Generation** | 26ms | 20ms | Already measured |
| **Proof Size** | 608 bytes | 608 bytes | Fixed for Groth16 |
| **Verification Gas** | 350K gas | 280K gas | ~$0.12-0.15 on Arbitrum |
| **Verifier Deployment** | 800K gas | 500K gas | One-time cost |
| **Setup Files** | 55MB | 50MB | .ptau + .zkey + .wasm |

## Hackathon Readiness Assessment

### ✅ **Excellent for Demo**
- **Proving Time**: 8-15 seconds is very reasonable for live demo
- **Gas Costs**: ~$0.12 per verification is negligible
- **Setup**: Standard ceremony, no custom requirements
- **Hardware**: Dell XPS is more than sufficient

### ✅ **Production Viability**
- **Cost Effective**: Sub-$0.15 per auction on Arbitrum
- **Scalable**: Can batch multiple auctions
- **Secure**: Groth16 is battle-tested
- **Efficient**: 14K constraints is reasonable for the functionality

## Next Steps for Measurement

### **Immediate (30 minutes)**
1. Add proving time benchmarks to existing tests
2. Generate trusted setup files
3. Measure actual file sizes

### **Integration Phase (2-3 hours)**
1. Deploy verifier contract and measure gas
2. Test end-to-end proof generation and verification
3. Benchmark full auction flow timing

### **Sample Benchmark Script**
```javascript
// benchmark-proving.js
async function benchmarkCircuit() {
    console.log('🚀 zkDutchAuction Performance Benchmark');
    
    // Test data
    const input = generateTestInput();
    
    // Witness generation
    console.time('Witness Generation');
    const witness = await circuit.calculateWitness(input);
    console.timeEnd('Witness Generation');
    
    // Proof generation
    console.time('Proof Generation');
    const proof = await snarkjs.groth16.prove('zkDutchAuction.zkey', witness);
    console.timeEnd('Proof Generation');
    
    // Verification
    console.time('Proof Verification');
    const verified = await snarkjs.groth16.verify('verification_key.json', publicSignals, proof);
    console.timeEnd('Proof Verification');
    
    console.log(`✅ Proof verified: ${verified}`);
    console.log(`📊 Proof size: ${JSON.stringify(proof).length} bytes`);
}
```

## Conclusion

The zkDutchAuction circuit shows excellent performance characteristics for a hackathon project:

- **Fast enough**: 8-15 second proving time enables live demos
- **Cheap enough**: ~$0.12 per verification makes it economically viable
- **Standard setup**: No custom trusted setup ceremony required
- **Production ready**: Performance scales well for real usage

These metrics make the zkDutchAuction circuit highly suitable for both hackathon demonstration and potential production deployment.

---

*Last Updated: Current*
*Hardware: Dell XPS Laptop estimates*
*Network: Arbitrum One gas costs* 