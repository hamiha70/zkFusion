const shell = require('shelljs');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');

async function compileCircuit() {
  const spinner = ora('Starting circuit compilation...').start();
  
  try {
    // Ensure circuits directory exists
    const circuitsDir = path.join(__dirname, '../../circuits');
    if (!fs.existsSync(circuitsDir)) {
      throw new Error('Circuits directory not found');
    }

    // Change to circuits directory
    shell.cd(circuitsDir);
    
    // Check if circom is installed
    if (!shell.which('circom')) {
      spinner.fail('Circom not found. Please install circom globally.');
      console.log(chalk.yellow('Install with: npm install -g circom'));
      process.exit(1);
    }

    spinner.text = 'Compiling zkDutchAuction8 circuit...';
    
    // Compile the N=8 circuit with circomlib include path
    const circomlibPath = path.join(__dirname, '../../node_modules/circomlib/circuits');
    const compileResult = shell.exec(
      `circom zkDutchAuction8.circom --r1cs --wasm --sym --c -l ${circomlibPath}`,
      { silent: false }
    );
    
    if (compileResult.code !== 0) {
      throw new Error('Circuit compilation failed');
    }

    // Check if required files were generated
    const requiredFiles = [
      'zkDutchAuction8.r1cs',
      'zkDutchAuction8_js/zkDutchAuction8.wasm',
      'zkDutchAuction8.sym'
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(circuitsDir, file))) {
        throw new Error(`Required file ${file} was not generated`);
      }
    }

    spinner.succeed('Circuit compilation completed successfully!');
    
    console.log(chalk.green('\n✅ Generated files:'));
    console.log(chalk.gray('  • zkDutchAuction8.r1cs (R1CS constraint system)'));
    console.log(chalk.gray('  • zkDutchAuction8_js/zkDutchAuction8.wasm (WASM witness generator)'));
    console.log(chalk.gray('  • zkDutchAuction8.sym (Symbol file)'));
    
    console.log(chalk.blue('\n🔧 Next steps:'));
    console.log(chalk.blue('  npm run circuit:setup  # Run trusted setup'));
    console.log(chalk.blue('  npm run circuit:prove  # Generate a proof'));

  } catch (error) {
    spinner.fail(`Circuit compilation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  compileCircuit();
}

module.exports = { compileCircuit }; 