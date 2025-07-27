const shell = require('shelljs');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');

async function setupCeremony() {
  const spinner = ora('Starting trusted setup ceremony...').start();
  
  try {
    const circuitsDir = path.join(__dirname, '../../circuits');
    
    // Ensure we're in circuits directory
    shell.cd(circuitsDir);
    
    // Check if snarkjs is available
    if (!shell.which('snarkjs')) {
      spinner.fail('SnarkJS not found. Please install snarkjs globally.');
      console.log(chalk.yellow('Install with: npm install -g snarkjs'));
      process.exit(1);
    }

    // Check if R1CS file exists
    if (!fs.existsSync('zkDutchAuction.r1cs')) {
      spinner.fail('R1CS file not found. Please run circuit compilation first.');
      console.log(chalk.yellow('Run: npm run circuit:compile'));
      process.exit(1);
    }

    // Download powers of tau file if it doesn't exist
    const ptauFile = 'pot12_final.ptau';
    if (!fs.existsSync(ptauFile)) {
      spinner.text = 'Downloading powers of tau file (this may take a while)...';
      
      const downloadResult = shell.exec(
        `wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau -O ${ptauFile}`,
        { silent: true }
      );
      
      if (downloadResult.code !== 0) {
        // Try with curl if wget fails
        const curlResult = shell.exec(
          `curl -o ${ptauFile} https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau`,
          { silent: true }
        );
        
        if (curlResult.code !== 0) {
          throw new Error('Failed to download powers of tau file. Please download manually.');
        }
      }
      
      spinner.text = 'Powers of tau file downloaded successfully';
    }

    // Generate proving key
    spinner.text = 'Generating proving key...';
    const setupResult = shell.exec(
      `snarkjs groth16 setup zkDutchAuction.r1cs ${ptauFile} circuit_final.zkey`,
      { silent: false }
    );
    
    if (setupResult.code !== 0) {
      throw new Error('Proving key generation failed');
    }

    // Export verification key
    spinner.text = 'Exporting verification key...';
    const vkeyResult = shell.exec(
      'snarkjs zkey export verificationkey circuit_final.zkey verification_key.json',
      { silent: false }
    );
    
    if (vkeyResult.code !== 0) {
      throw new Error('Verification key export failed');
    }

    // Generate Solidity verifier
    spinner.text = 'Generating Solidity verifier contract...';
    const solidityResult = shell.exec(
      'snarkjs zkey export solidityverifier circuit_final.zkey ../contracts/Verifier.sol',
      { silent: false }
    );
    
    if (solidityResult.code !== 0) {
      throw new Error('Solidity verifier generation failed');
    }

    // Update the Solidity verifier to match our interface
    const verifierPath = path.join(__dirname, '../../contracts/Verifier.sol');
    if (fs.existsSync(verifierPath)) {
      let verifierContent = fs.readFileSync(verifierPath, 'utf8');
      
      // Update contract name and SPDX license
      verifierContent = verifierContent.replace(
        /pragma solidity \^0\.\d+\.\d+;/,
        '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.17;'
      );
      verifierContent = verifierContent.replace(
        /contract Verifier/,
        'contract Verifier'
      );
      
      fs.writeFileSync(verifierPath, verifierContent);
    }

    spinner.succeed('Trusted setup ceremony completed successfully!');
    
    console.log(chalk.green('\n✅ Generated files:'));
    console.log(chalk.gray('  • circuit_final.zkey (Proving key)'));
    console.log(chalk.gray('  • verification_key.json (Verification key)'));
    console.log(chalk.gray('  • contracts/Verifier.sol (Solidity verifier)'));
    
    console.log(chalk.blue('\n🔧 Next steps:'));
    console.log(chalk.blue('  npm run compile         # Compile contracts including new Verifier'));
    console.log(chalk.blue('  npm run circuit:prove   # Generate your first proof'));

  } catch (error) {
    spinner.fail(`Trusted setup failed: ${error.message}`);
    console.log(chalk.red('\n💡 Troubleshooting:'));
    console.log(chalk.gray('  • Ensure you have internet connection for ptau download'));
    console.log(chalk.gray('  • Make sure you have enough disk space (ptau file is ~50MB)'));
    console.log(chalk.gray('  • Run npm run circuit:compile first if R1CS file is missing'));
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupCeremony();
}

module.exports = { setupCeremony }; 