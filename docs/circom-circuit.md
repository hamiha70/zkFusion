# zkFusion Circom Circuit Design & Implementation

**Last Updated**: January 2025  
**Status**: ✅ **COMPILATION SUCCESSFUL** - Ready for Testing Phase  
**Circuit Complexity**: 1,804 non-linear constraints, 1,615 linear constraints

---

## 🎯 **CIRCUIT OVERVIEW**

### **Core Problem: Dutch Auction with ZK Privacy**
zkFusion implements a **Dutch auction mechanism** where:
- Bidders submit **private commitments** (Poseidon hashes of bids)
- Auction runner collects bids and runs **off-chain sorting + matching**
- ZK circuit **verifies** the auction was run correctly without revealing individual bids
- **Price-time priority** is maintained (highest bidders matched first)

### **Key Innovation: Off-chain Sorting + ZK Verification**
Instead of implementing expensive O(n log n) sorting in ZK, we use:
1. **Off-chain**: Sort bids and create permutation mapping
2. **ZK Circuit**: Verify sorting is correct using O(n) verification
3. **Result**: Efficient ZK proof with full auction integrity

---

## 🏗️ **CIRCUIT ARCHITECTURE**

### **Input Signals**

#### **Private Inputs (Hidden from Public)**
```circom
// Original bid data (from revealed commitments)
signal input bidPrices[N];     // [600, 1000, 400, 800]
signal input bidAmounts[N];    // [10, 20, 15, 30]  
signal input nonces[N];        // [123, 456, 789, 012]

// Sorting verification data (computed off-chain)
signal input sortedPrices[N];  // [1000, 800, 600, 400] (descending)
signal input sortedAmounts[N]; // [20, 30, 10, 15] (corresponding amounts)
signal input sortedIndices[N]; // [1, 3, 0, 2] (permutation mapping)
```

#### **Public Inputs (Visible to All)**
```circom
signal input commitments[N];           // On-chain Poseidon hashes
signal input makerAsk;                 // Maximum fill amount
signal input commitmentContractAddress; // Binds proof to specific auction
```

### **Output Signals**
```circom
signal output totalFill;        // Total amount filled
signal output weightedAvgPrice; // Actually total value (avoid division in ZK)
signal output numWinners;       // Number of winning bidders
```

---

## 🔧 **TECHNICAL CHALLENGES & SOLUTIONS**

### **Challenge 1: Sorting in Zero-Knowledge**
**Problem**: Traditional sorting algorithms require O(n log n) comparisons with complex branching logic, leading to non-quadratic constraints in Circom.

**❌ Initial Approach**: Implement bitonic sort directly in Circom
```circom
// This creates non-quadratic constraints!
if (a > b) {
    swap(a, b);  // Conditional logic is expensive in ZK
}
```

**✅ Breakthrough Solution**: Off-chain Sorting + ZK Verification
```circom
// 1. Verify sorting order (O(n) linear verification)
for (var i = 0; i < N-1; i++) {
    sortedPrices[i] >= sortedPrices[i+1]; // Descending order
}

// 2. Verify permutation correctness using selector pattern
for (var i = 0; i < N; i++) {
    // Use quadratic constraints to verify: sortedPrices[i] == originalPrices[sortedIndices[i]]
    signal priceSum[N+1];
    for (var j = 0; j < N; j++) {
        eq[i][j] = IsEqual();
        eq[i][j].in[0] <== sortedIndices[i];
        eq[i][j].in[1] <== j;
        priceSum[j+1] <== priceSum[j] + eq[i][j].out * originalPrices[j];
    }
    sortedPrices[i] === priceSum[N];
}
```

**Key Insight**: The permutation verification uses a "selector pattern" where `sortedIndices[i] = j` means "the i-th highest bid was originally at position j".

### **Challenge 2: Dynamic Array Indexing**
**Problem**: Circom doesn't allow `array[signal_index]` because it creates non-quadratic constraints.

**❌ Attempted**: `originalPrices[permutation[i]]`
**Error**: `Non-quadratic constraint was detected statically`

**✅ Solution**: Selector Pattern with IsEqual Components
```circom
// Instead of direct indexing, use binary selectors
component eq[N][N];
for (var i = 0; i < N; i++) {
    for (var j = 0; j < N; j++) {
        eq[i][j] = IsEqual();
        eq[i][j].in[0] <== sortedIndices[i];  // Which original position?
        eq[i][j].in[1] <== j;                 // Is it position j?
        // eq[i][j].out is 1 only when sortedIndices[i] == j
    }
}
```

### **Challenge 3: Triple Multiplication (Non-Quadratic)**
**Problem**: Computing weighted auction value required `isWinner[i] * sortedPrices[i] * sortedAmounts[i]`

**❌ Error**: `Non quadratic constraints are not allowed!`

**✅ Solution**: Break Down Complex Multiplications
```circom
// Step 1: Pre-compute bid values (quadratic)
signal bidValue[N];
for (var i = 0; i < N; i++) {
    bidValue[i] <== sortedPrices[i] * sortedAmounts[i];
}

// Step 2: Apply winner selection (quadratic)
cumulativeValue[i+1] <== cumulativeValue[i] + isWinner[i] * bidValue[i];
```

### **Challenge 4: Circom Include Path Issues**
**Problem**: Circuit compilation failed with `circomlib/circuits/poseidon.circom not found`

**✅ Solution**: Proper Include Path Configuration
```javascript
// In compile script
const circomlibPath = path.join(__dirname, '../../node_modules/circomlib/circuits');
const compileResult = shell.exec(
  `circom zkDutchAuction.circom --r1cs --wasm --sym --c -l ${circomlibPath}`
);
```

```circom
// In circuit file
include "poseidon.circom";      // Not "circomlib/circuits/poseidon.circom"
include "comparators.circom";
```

---

## 📊 **CIRCUIT STATISTICS**

### **Compilation Results** ✅
```
Template instances: 146
Non-linear constraints: 1,804
Linear constraints: 1,615
Private inputs: 30
Public outputs: 3
Wires: 3,428
Labels: 5,024
```

### **Constraint Breakdown**
- **Sorting Verification**: ~400 constraints (N×N selector pattern)
- **Commitment Verification**: ~600 constraints (N Poseidon hashes)
- **Auction Logic**: ~500 constraints (greedy fill algorithm)
- **Address Binding**: ~300 constraints (commitment contract verification)
- **Utility Components**: ~100 constraints (comparators, arithmetic)

### **Scalability Analysis**
For N bidders:
- **Constraints**: O(N²) due to sorting verification
- **Proving Time**: ~2-5 seconds for N=4 (estimated)
- **Verification Time**: ~5ms (constant)
- **Proof Size**: ~200 bytes (constant)

---

## 🧪 **TESTING STRATEGY**

### **Recommended Approach: Circomkit + TypeScript**

**Why Circomkit?**
- ✅ **Modern Testing Framework**: Built specifically for Circom circuits
- ✅ **TypeScript Support**: Native TypeScript integration for type safety
- ✅ **Witness Testing**: Easy input/output validation without full proof generation
- ✅ **Performance Testing**: Built-in benchmarking and constraint analysis
- ✅ **Integration Ready**: Works seamlessly with existing zkFusion infrastructure

**Why TypeScript for Circuit Testing?**
- ✅ **Type Safety**: Critical for complex circuit inputs/outputs
- ✅ **Error Prevention**: Catch field element overflow, type mismatches early
- ✅ **IDE Support**: Better autocomplete and error detection
- ✅ **Documentation**: Self-documenting interfaces for circuit contracts

### **Testing Categories**

#### **1. Basic Functionality Tests**
```typescript
// Test core auction logic with simple inputs
it('should verify correct sorting with identity permutation', async () => {
  const input: CircuitInputs = {
    bidPrices: [1000n, 800n, 600n, 400n],
    bidAmounts: [100n, 150n, 200n, 250n],
    // ... other inputs
  };
  await circuit.expectPass(input, expectedOutput);
});
```

#### **2. Sorting Verification Tests**
```typescript
// Test that invalid sorting is rejected
it('should reject invalid sorting order', async () => {
  const input = {
    // ... inputs with wrong sorting
  };
  await circuit.expectFail(input);
});
```

#### **3. Attack Vector Tests**
```typescript
// Test malicious permutation attempts
it('should reject malicious permutation', async () => {
  const input = {
    // ... inputs with incorrect permutation mapping
  };
  await circuit.expectFail(input);
});
```

#### **4. Performance Tests**
```typescript
it('should generate witness within timeout', async () => {
  // Ensure witness generation completes in reasonable time
  const start = Date.now();
  await circuit.calculateWitness(input);
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(5000); // 5 second timeout
});
```

---

## ⚙️ **CIRCUITS.JSON CONFIGURATION**

### **Purpose & Location**
The `circuits.json` file at the project root is the **Circomkit configuration file** that defines how our ZK circuits should be compiled and tested.

**Standard Location**: ✅ **Project Root** (correct)
- **Why**: Circomkit expects this file at the root level
- **Tool Integration**: Our TypeScript tests reference this configuration
- **Build Process**: `npm run test:circuits` uses this file

### **Current Configuration**
```json
{
  "zkDutchAuction": {
    "file": "zkDutchAuction",
    "template": "zkDutchAuction", 
    "params": [4],
    "pubs": [
      "commitments",
      "makerAsk", 
      "commitmentContractAddress"
    ]
  }
}
```

### **Configuration Breakdown**

#### **Circuit Definition**
- **`"zkDutchAuction"`**: Circuit identifier (used in tests)
- **`"file"`**: Circuit file name (without `.circom` extension)
- **`"template"`**: Template name in the circuit file
- **`"params"`**: Template parameters `[N]` where N=4 (4 bidders)

#### **Public Inputs**
- **`"pubs"`**: Array of public input signal names
- **`"commitments"`**: Poseidon hashes of bid commitments
- **`"makerAsk"`**: Maximum amount maker wants to fill
- **`"commitmentContractAddress"`**: Binds proof to specific auction

### **Integration with TypeScript Tests**
```typescript
// In test-circuits/zkDutchAuction.test.ts
const circomkit = new Circomkit({
  protocol: 'groth16',
  prime: 'bn128',
  verbose: true
});

// Uses circuits.json configuration automatically
const circuit = await circomkit.WitnessTester('zkDutchAuction');
```

### **Build Process Integration**
```bash
# package.json script uses circuits.json
npm run test:circuits
# → Runs: mocha test-circuits/**/*.test.ts --require ts-node/register
```

### **Adding New Circuits**
To add additional circuits (e.g., for different auction types):

```json
{
  "zkDutchAuction": { /* existing config */ },
  "zkEnglishAuction": {
    "file": "zkEnglishAuction",
    "template": "zkEnglishAuction",
    "params": [4],
    "pubs": ["commitments", "reservePrice", "auctionId"]
  }
}
```

### **Configuration Best Practices**

#### **1. Parameter Naming**
- Use descriptive circuit identifiers
- Match file names exactly (case-sensitive)
- Ensure template names match circuit definitions

#### **2. Public Input Selection**
- Only include inputs that need to be public
- Keep public input count minimal (affects proof size)
- Use consistent naming across related circuits

#### **3. Parameter Sizing**
- Start with small N values for testing (N=4)
- Scale up gradually as performance allows
- Document parameter limits for production

#### **4. Version Control**
- ✅ **Commit circuits.json**: Configuration should be version controlled
- ✅ **Include in CI/CD**: Ensure tests run with consistent configuration
- ✅ **Document changes**: Update when adding new circuits

### **Troubleshooting Common Issues**

#### **Circuit Not Found**
```bash
Error: Circuit 'zkDutchAuction' not found in circuits.json
```
**Solution**: Verify file name and template name match exactly

#### **Parameter Mismatch**
```bash
Error: Expected 1 parameter, got 2
```
**Solution**: Check `params` array matches template signature

#### **Public Input Error**
```bash
Error: Public input 'commitments' not found in circuit
```
**Solution**: Verify signal names match circuit definition exactly

---

## 🚀 **IMPLEMENTATION ROADMAP**

### **Phase 1: Circuit Testing Setup** ⏳ **NEXT**
1. **Install Circomkit**: `npm install circomkit`
2. **Create Circuit Config**: Define zkDutchAuction in `circuits.json`
3. **Basic Test Suite**: Implement core functionality tests
4. **Validate Compilation**: Ensure circuit compiles consistently

### **Phase 2: Comprehensive Testing** 
1. **Edge Case Coverage**: Test all boundary conditions
2. **Attack Vector Testing**: Verify security properties
3. **Performance Benchmarking**: Measure proving/verification times
4. **Integration Testing**: Connect with existing zkFusion components

### **Phase 3: Production Readiness**
1. **Gas Optimization**: Minimize constraint count where possible
2. **Scalability Testing**: Test with larger N values
3. **Real Data Integration**: Test with actual auction data
4. **Documentation**: Create circuit usage guide

---

## 💡 **KEY INSIGHTS & LESSONS LEARNED**

### **Circuit Design Principles**
1. **Avoid Dynamic Indexing**: Use selector patterns instead of `array[signal]`
2. **Minimize Constraint Degree**: Break complex multiplications into steps
3. **Off-chain Computation**: Do expensive work off-chain, verify in ZK
4. **Quadratic Constraint Discipline**: Every constraint must be quadratic

### **Debugging Strategies**
1. **Incremental Development**: Build and test small components first
2. **Constraint Analysis**: Monitor constraint count as complexity increases
3. **Error Message Interpretation**: Circom errors can be cryptic - look for patterns
4. **Include Path Management**: Proper library configuration is critical

### **Performance Considerations**
1. **Constraint Count**: Primary driver of proving time
2. **Circuit Depth**: Affects memory usage during proving
3. **Public Input Count**: More public inputs = larger proof verification cost
4. **Field Element Size**: Stay within field bounds for efficiency

---

## 🔗 **INTEGRATION WITH zkFUSION**

### **Contract Integration Points**
```solidity
// zkFusionExecutor expects these public outputs
struct AuctionResult {
    uint256 totalFill;        // From circuit output
    uint256 weightedAvgPrice; // Actually totalValue - contract calculates price
    uint256 numWinners;       // From circuit output
    address[] winners;        // Derived from permutation mapping
}
```

### **Off-chain Integration**
```javascript
// Auction runner workflow
1. Collect revealed bids from commitments
2. Sort bids by price (descending)
3. Create permutation mapping: sortedIndices[i] = originalPosition
4. Generate circuit inputs
5. Create ZK proof
6. Submit to zkFusionExecutor
```

### **Data Flow**
```
BidCommitment → Reveal → Sort → ZK Proof → Executor → LOP Fill
     ↓             ↓       ↓        ↓         ↓        ↓
  Poseidon     Auction   Circuit  Groth16   Contract  1inch
   Hash        Logic    Inputs    Proof    Execution Integration
```

---

## 📚 **REFERENCES & RESOURCES**

### **Technical Documentation**
- [Circom Documentation](https://docs.circom.io/)
- [Circomkit Testing Framework](https://github.com/erhant/circomkit)
- [Circomlib Components](https://github.com/iden3/circomlib)
- [SnarkJS Proof System](https://github.com/iden3/snarkjs)

### **ZK Circuit Design Patterns**
- [Circom101 Educational Examples](https://github.com/erhant/circom101)
- [ZK Proof MOOC Resources](https://zk-learning.org/)
- [Awesome Zero Knowledge](https://github.com/matter-labs/awesome-zero-knowledge-proofs)

### **Dutch Auction & MEV Research**
- [1inch Fusion+ Whitepaper](https://docs.1inch.io/docs/fusion-plus/introduction)
- [MEV Protection Mechanisms](https://ethereum.org/en/developers/docs/mev/)
- [Batch Auction Theory](https://en.wikipedia.org/wiki/Batch_auction)

---

## 🎯 **SUCCESS METRICS**

### **Circuit Validation**
- ✅ **Compilation Success**: Circuit compiles without errors
- ⏳ **Test Coverage**: >95% of circuit logic tested
- ⏳ **Security Validation**: All attack vectors tested and blocked
- ⏳ **Performance**: Proving time <10 seconds for N=4

### **Integration Success**
- ⏳ **End-to-End Flow**: Full auction with real ZK proofs
- ⏳ **Gas Efficiency**: Reasonable verification costs
- ⏳ **Reliability**: Consistent proof generation
- ⏳ **Scalability**: Works with intended auction sizes

### **Hackathon Demo Readiness**
- ⏳ **Working Demo**: Complete auction flow with ZK proofs
- ⏳ **Error Handling**: Graceful failure modes
- ⏳ **Performance**: Demo runs smoothly without timeouts
- ⏳ **Explanation**: Clear technical narrative for judges

---

**This document captures the complete journey from initial circuit design challenges to the breakthrough sorting verification solution. The next step is implementing comprehensive Circomkit testing to validate our circuit behaves exactly as designed.**

**Note**: For our JavaScript vs TypeScript development strategy, see [JS-TS.md](JS-TS.md).

--- 