/**
 * Regenerate real-hash-inputs.json with current poseidon-lite implementation
 */

const fs = require('fs');
const path = require('path');

// Import our utilities
const { generateCircuitInputs } = require('./circuits/utils/input-generator.ts');
const { generateCommitmentReal } = require('./circuits/utils/hash-utils.ts');

async function regenerateInputs() {
  console.log('🧪 Regenerating circuit inputs with current poseidon-lite implementation...');
  
  // Use the same test case that our debug tests use
  const testBids = [
    {
      price: 2000000000000000000n, // 2.0 ETH
      amount: 50000000000000000000n, // 50 tokens
      bidderAddress: '0x1111111111111111111111111111111111111111',
      originalIndex: 0
    },
    {
      price: 1800000000000000000n, // 1.8 ETH
      amount: 30000000000000000000n, // 30 tokens
      bidderAddress: '0x2222222222222222222222222222222222222222',
      originalIndex: 1
    }
  ];

  const constraints = {
    makerMinimumPrice: 1500000000000000000n, // 1.5 ETH minimum
    makerMaximumAmount: 100000000000000000000n, // 100 tokens max
    commitmentContractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
  };

  // Generate commitments using current poseidon-lite
  console.log('🔄 Generating commitments with poseidon-lite...');
  const commitments = [];
  for (const bid of testBids) {
    const commitment = await generateCommitmentReal(bid, constraints.commitmentContractAddress);
    commitments.push(commitment);
    console.log(`  Bid ${bid.originalIndex}: ${commitment}`);
  }

  // Generate circuit inputs
  console.log('🔄 Generating circuit inputs...');
  const circuitInputs = generateCircuitInputs(testBids, constraints, commitments);

  // Save to file
  const inputsDir = path.join(__dirname, 'circuits/inputs');
  if (!fs.existsSync(inputsDir)) {
    fs.mkdirSync(inputsDir, { recursive: true });
  }

  const filepath = path.join(inputsDir, 'real-hash-inputs.json');
  fs.writeFileSync(filepath, JSON.stringify(circuitInputs, null, 2));

  console.log(`✅ Generated fresh input data: ${filepath}`);
  console.log('📊 Sample commitments:');
  console.log(`  Bid 0: ${circuitInputs.commitments[0]}`);
  console.log(`  Null bids: ${circuitInputs.commitments[2]}`);
}

regenerateInputs().catch(console.error); 