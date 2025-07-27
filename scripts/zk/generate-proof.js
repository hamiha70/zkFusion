const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const chalk = require('chalk');
const ora = require('ora');
const { generateCircuitInputs, simulateAuction, generateExpectedOutputs, saveInputsToFile } = require('../../circuits/utils/input-generator');
const { hashBid, generateNonce } = require('../../circuits/utils/poseidon');

async function generateProof(inputData = null) {
  const spinner = ora('Starting proof generation...').start();
  
  try {
    const circuitsDir = path.join(__dirname, '../../circuits');
    
    // Check required files exist
    const requiredFiles = [
      'zkDutchAuction_js/zkDutchAuction.wasm',
      'circuit_final.zkey'
    ];
    
    for (const file of requiredFiles) {
      const filepath = path.join(circuitsDir, file);
      if (!fs.existsSync(filepath)) {
        throw new Error(`Required file not found: ${file}. Run circuit setup first.`);
      }
    }

    spinner.text = 'Preparing circuit inputs...';
    
    // Use provided input data or generate example data
    let circuitInputs;
    if (inputData) {
      circuitInputs = inputData;
    } else {
      // Generate example auction data
      const exampleBids = [
        { price: 1200n, amount: 100n, nonce: generateNonce(), bidder: "0x1234567890123456789012345678901234567890" },
        { price: 1150n, amount: 150n, nonce: generateNonce(), bidder: "0x2345678901234567890123456789012345678901" },
        { price: 1100n, amount: 200n, nonce: generateNonce(), bidder: "0x3456789012345678901234567890123456789012" },
      ];

      // Generate commitments
      const commitments = [];
      for (const bid of exampleBids) {
        const commitment = await hashBid(bid.price, bid.amount, bid.nonce);
        commitments.push(commitment);
      }
      
      // Pad commitments to 4 elements
      while (commitments.length < 4) {
        commitments.push('0');
      }

      const makerAsk = 400n;
      const commitmentContractAddress = "0x1111111111111111111111111111111111111111";

      // Generate circuit inputs
      circuitInputs = await generateCircuitInputs(
        exampleBids,
        commitments,
        makerAsk,
        commitmentContractAddress
      );

      // Save inputs for reference
      saveInputsToFile(circuitInputs, 'example_input.json');
      
      console.log(chalk.blue('\n📋 Example auction data:'));
      console.log(chalk.gray(`  Bids: ${exampleBids.length}`));
      console.log(chalk.gray(`  Maker ask: ${makerAsk}`));
      
      exampleBids.forEach((bid, i) => {
        console.log(chalk.gray(`    ${i+1}. Price: ${bid.price}, Amount: ${bid.amount}`));
      });
    }

    spinner.text = 'Generating witness...';
    
    // Generate witness
    const { witness } = await snarkjs.groth16.fullProve(
      circuitInputs,
      path.join(circuitsDir, "zkDutchAuction_js/zkDutchAuction.wasm"),
      path.join(circuitsDir, "circuit_final.zkey")
    );

    spinner.text = 'Computing proof...';
    
    // Generate proof
    const { proof, publicSignals } = await snarkjs.groth16.prove(
      path.join(circuitsDir, "circuit_final.zkey"),
      witness
    );

    spinner.text = 'Saving proof artifacts...';
    
    // Ensure proofs directory exists
    const proofsDir = path.join(circuitsDir, 'proofs');
    if (!fs.existsSync(proofsDir)) {
      fs.mkdirSync(proofsDir, { recursive: true });
    }

    // Save proof and public signals
    fs.writeFileSync(
      path.join(proofsDir, 'proof.json'),
      JSON.stringify(proof, null, 2)
    );
    
    fs.writeFileSync(
      path.join(proofsDir, 'public.json'),
      JSON.stringify(publicSignals, null, 2)
    );

    // Format proof for Solidity contract call
    const solidityProof = formatProofForSolidity(proof);
    const solidityPublicSignals = publicSignals.map(signal => signal.toString());
    
    // Save formatted proof
    const formattedProof = {
      proof: solidityProof,
      publicSignals: solidityPublicSignals,
      formattedForContract: {
        proof: solidityProof,
        publicInputs: solidityPublicSignals
      }
    };
    
    fs.writeFileSync(
      path.join(proofsDir, 'formatted_proof.json'),
      JSON.stringify(formattedProof, null, 2)
    );

    spinner.succeed('Proof generation completed successfully!');
    
    console.log(chalk.green('\n✅ Generated files:'));
    console.log(chalk.gray('  • circuits/proofs/proof.json (Raw proof)'));
    console.log(chalk.gray('  • circuits/proofs/public.json (Public signals)'));
    console.log(chalk.gray('  • circuits/proofs/formatted_proof.json (Contract-ready)'));
    
    console.log(chalk.blue('\n📊 Proof summary:'));
    console.log(chalk.gray(`  Public signals: ${publicSignals.length}`));
    console.log(chalk.gray(`  Total fill: ${publicSignals[4]}`));
    console.log(chalk.gray(`  Weighted avg price: ${publicSignals[5]}`));
    
    console.log(chalk.blue('\n🔧 Next steps:'));
    console.log(chalk.blue('  npm run circuit:verify      # Verify the proof locally'));
    console.log(chalk.blue('  npm run example:with-zk     # Run example with real ZK proof'));

    return {
      proof: solidityProof,
      publicSignals: solidityPublicSignals,
      rawProof: proof,
      witness
    };

  } catch (error) {
    spinner.fail(`Proof generation failed: ${error.message}`);
    console.log(chalk.red('\n💡 Troubleshooting:'));
    console.log(chalk.gray('  • Ensure circuit compilation completed: npm run circuit:compile'));
    console.log(chalk.gray('  • Ensure trusted setup completed: npm run circuit:setup'));
    console.log(chalk.gray('  • Check that input values are valid field elements'));
    console.log(chalk.gray('  • Verify circuit constraints are satisfied'));
    throw error;
  }
}

/**
 * Format proof for Solidity contract consumption
 * @param {Object} proof - Raw proof from snarkjs
 * @returns {Array} - Formatted proof array
 */
function formatProofForSolidity(proof) {
  return [
    proof.pi_a[0], proof.pi_a[1],
    proof.pi_b[0][1], proof.pi_b[0][0],
    proof.pi_b[1][1], proof.pi_b[1][0],
    proof.pi_c[0], proof.pi_c[1]
  ];
}

/**
 * Generate proof with custom input data
 * @param {Array} bids - Array of bid objects
 * @param {Array} commitments - Array of commitment hashes  
 * @param {BigInt} makerAsk - Maker ask amount
 * @param {string} commitmentContractAddress - Contract address
 * @returns {Object} - Proof data
 */
async function generateProofWithData(bids, commitments, makerAsk, commitmentContractAddress) {
  const circuitInputs = await generateCircuitInputs(bids, commitments, makerAsk, commitmentContractAddress);
  return await generateProof(circuitInputs);
}

// Run if called directly
if (require.main === module) {
  generateProof()
    .then(() => {
      console.log(chalk.green('\n🎉 Proof generation completed!'));
      process.exit(0);
    })
    .catch((error) => {
      console.error(chalk.red('❌ Proof generation failed:'), error.message);
      process.exit(1);
    });
}

module.exports = {
  generateProof,
  generateProofWithData,
  formatProofForSolidity
}; 