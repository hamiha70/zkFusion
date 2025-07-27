const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const chalk = require('chalk');
const ora = require('ora');

async function verifyProof(proofFile = 'proof.json', publicFile = 'public.json') {
  const spinner = ora('Starting proof verification...').start();
  
  try {
    const circuitsDir = path.join(__dirname, '../../circuits');
    const proofsDir = path.join(circuitsDir, 'proofs');
    
    // Check if verification key exists
    const vkeyPath = path.join(circuitsDir, 'verification_key.json');
    if (!fs.existsSync(vkeyPath)) {
      throw new Error('Verification key not found. Run trusted setup first.');
    }

    // Check if proof files exist
    const proofPath = path.join(proofsDir, proofFile);
    const publicPath = path.join(proofsDir, publicFile);
    
    if (!fs.existsSync(proofPath)) {
      throw new Error(`Proof file not found: ${proofPath}`);
    }
    
    if (!fs.existsSync(publicPath)) {
      throw new Error(`Public signals file not found: ${publicPath}`);
    }

    spinner.text = 'Loading verification key...';
    
    // Load verification key
    const vKey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));
    
    spinner.text = 'Loading proof and public signals...';
    
    // Load proof and public signals
    const proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
    const publicSignals = JSON.parse(fs.readFileSync(publicPath, 'utf8'));

    spinner.text = 'Verifying proof...';
    
    // Verify the proof
    const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    
    if (isValid) {
      spinner.succeed('Proof verification successful!');
      
      console.log(chalk.green('\n✅ Proof is valid'));
      console.log(chalk.blue('\n📊 Public signals:'));
      
      // Parse and display public signals in a readable format
      if (publicSignals.length >= 8) {
        console.log(chalk.gray('  Winning commitments:'));
        for (let i = 0; i < 4; i++) {
          const commitment = publicSignals[i];
          if (commitment !== '0') {
            console.log(chalk.gray(`    [${i}]: ${commitment}`));
          }
        }
        
        console.log(chalk.gray(`  Total fill: ${publicSignals[4]}`));
        console.log(chalk.gray(`  Weighted avg price: ${publicSignals[5]}`));
        console.log(chalk.gray(`  Maker ask: ${publicSignals[6]}`));
        console.log(chalk.gray(`  Contract address: ${publicSignals[7]}`));
      } else {
        console.log(chalk.gray(`  Signals: ${publicSignals.join(', ')}`));
      }
      
      console.log(chalk.blue('\n🔧 Next steps:'));
      console.log(chalk.blue('  npm run example:with-zk     # Use this proof in example auction'));
      console.log(chalk.blue('  npm run deploy             # Deploy contracts to use proof on-chain'));
      
      return true;
    } else {
      spinner.fail('Proof verification failed!');
      
      console.log(chalk.red('\n❌ Proof is invalid'));
      console.log(chalk.red('\n💡 Possible causes:'));
      console.log(chalk.gray('  • Proof was generated with different circuit'));
      console.log(chalk.gray('  • Public signals don\'t match the proof'));
      console.log(chalk.gray('  • Circuit constraints were not satisfied'));
      console.log(chalk.gray('  • Verification key doesn\'t match proving key'));
      
      return false;
    }

  } catch (error) {
    spinner.fail(`Proof verification failed: ${error.message}`);
    console.log(chalk.red('\n💡 Troubleshooting:'));
    console.log(chalk.gray('  • Ensure trusted setup completed: npm run circuit:setup'));
    console.log(chalk.gray('  • Ensure proof exists: npm run circuit:prove'));
    console.log(chalk.gray('  • Check file paths and permissions'));
    throw error;
  }
}

/**
 * Verify proof with custom files
 * @param {string} proofPath - Path to proof file
 * @param {string} publicPath - Path to public signals file
 * @param {string} vkeyPath - Path to verification key file
 * @returns {boolean} - True if proof is valid
 */
async function verifyProofWithFiles(proofPath, publicPath, vkeyPath) {
  try {
    // Load files
    const vKey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));
    const proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
    const publicSignals = JSON.parse(fs.readFileSync(publicPath, 'utf8'));

    // Verify
    return await snarkjs.groth16.verify(vKey, publicSignals, proof);
  } catch (error) {
    console.error('Verification error:', error.message);
    return false;
  }
}

/**
 * Verify proof data directly (without files)
 * @param {Object} proof - Proof object
 * @param {Array} publicSignals - Public signals array
 * @param {Object} vKey - Verification key object
 * @returns {boolean} - True if proof is valid
 */
async function verifyProofData(proof, publicSignals, vKey) {
  try {
    return await snarkjs.groth16.verify(vKey, publicSignals, proof);
  } catch (error) {
    console.error('Verification error:', error.message);
    return false;
  }
}

/**
 * Batch verify multiple proofs
 * @param {Array} proofFiles - Array of proof file objects {proof, public}
 * @returns {Object} - Verification results
 */
async function batchVerifyProofs(proofFiles) {
  const results = {
    total: proofFiles.length,
    valid: 0,
    invalid: 0,
    errors: []
  };

  const circuitsDir = path.join(__dirname, '../../circuits');
  const vkeyPath = path.join(circuitsDir, 'verification_key.json');
  
  if (!fs.existsSync(vkeyPath)) {
    throw new Error('Verification key not found');
  }

  const vKey = JSON.parse(fs.readFileSync(vkeyPath, 'utf8'));

  for (let i = 0; i < proofFiles.length; i++) {
    const { proof: proofFile, public: publicFile } = proofFiles[i];
    
    try {
      console.log(chalk.blue(`\nVerifying proof ${i + 1}/${proofFiles.length}...`));
      
      const isValid = await verifyProofWithFiles(
        path.join(circuitsDir, 'proofs', proofFile),
        path.join(circuitsDir, 'proofs', publicFile),
        vkeyPath
      );
      
      if (isValid) {
        results.valid++;
        console.log(chalk.green(`✅ Proof ${i + 1} is valid`));
      } else {
        results.invalid++;
        console.log(chalk.red(`❌ Proof ${i + 1} is invalid`));
      }
    } catch (error) {
      results.errors.push({ index: i + 1, error: error.message });
      console.log(chalk.red(`❌ Error verifying proof ${i + 1}: ${error.message}`));
    }
  }

  return results;
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const proofFile = args[0] || 'proof.json';
  const publicFile = args[1] || 'public.json';
  
  verifyProof(proofFile, publicFile)
    .then((isValid) => {
      if (isValid) {
        console.log(chalk.green('\n🎉 Verification completed successfully!'));
        process.exit(0);
      } else {
        console.log(chalk.red('\n❌ Verification failed!'));
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error(chalk.red('❌ Verification error:'), error.message);
      process.exit(1);
    });
}

module.exports = {
  verifyProof,
  verifyProofWithFiles,
  verifyProofData,
  batchVerifyProofs
}; 