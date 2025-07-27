const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');

async function cleanArtifacts() {
  const spinner = ora('Cleaning ZK artifacts...').start();
  
  try {
    const circuitsDir = path.join(__dirname, '../../circuits');
    
    // Define artifacts to clean
    const artifactsToClean = [
      // Compilation artifacts
      'zkDutchAuction.r1cs',
      'zkDutchAuction.sym',
      'zkDutchAuction_js',
      'zkDutchAuction_cpp',
      
      // Setup artifacts
      'circuit_final.zkey',
      'verification_key.json',
      
      // Proof artifacts
      'proofs',
      'inputs',
      
      // Generated verifier
      '../contracts/Verifier.sol'
    ];

    let cleanedCount = 0;
    let totalSize = 0;

    for (const artifact of artifactsToClean) {
      const artifactPath = path.join(circuitsDir, artifact);
      
      if (fs.existsSync(artifactPath)) {
        const stats = fs.statSync(artifactPath);
        
        if (stats.isDirectory()) {
          // Remove directory recursively
          const size = await getDirectorySize(artifactPath);
          totalSize += size;
          fs.rmSync(artifactPath, { recursive: true, force: true });
          spinner.text = `Removed directory: ${artifact}`;
        } else {
          // Remove file
          totalSize += stats.size;
          fs.unlinkSync(artifactPath);
          spinner.text = `Removed file: ${artifact}`;
        }
        
        cleanedCount++;
      }
    }

    // Also clean up any .ptau files (they're large)
    const ptauFiles = fs.readdirSync(circuitsDir)
      .filter(file => file.endsWith('.ptau'));
    
    for (const ptauFile of ptauFiles) {
      const ptauPath = path.join(circuitsDir, ptauFile);
      const stats = fs.statSync(ptauPath);
      totalSize += stats.size;
      fs.unlinkSync(ptauPath);
      cleanedCount++;
      spinner.text = `Removed PTAU file: ${ptauFile}`;
    }

    if (cleanedCount > 0) {
      spinner.succeed(`Cleaned ${cleanedCount} artifacts (${formatBytes(totalSize)} freed)`);
      
      console.log(chalk.green('\n✅ Cleanup completed'));
      console.log(chalk.gray(`  Files/directories removed: ${cleanedCount}`));
      console.log(chalk.gray(`  Disk space freed: ${formatBytes(totalSize)}`));
      
      console.log(chalk.blue('\n🔧 To rebuild:'));
      console.log(chalk.blue('  npm run circuit:compile    # Recompile circuit'));
      console.log(chalk.blue('  npm run circuit:setup      # Redo trusted setup'));
      console.log(chalk.blue('  npm run circuit:prove      # Generate new proof'));
    } else {
      spinner.succeed('No artifacts found to clean');
      console.log(chalk.yellow('\n⚠️  No ZK artifacts were found to clean'));
    }

  } catch (error) {
    spinner.fail(`Cleanup failed: ${error.message}`);
    console.log(chalk.red('\n💡 Troubleshooting:'));
    console.log(chalk.gray('  • Check file permissions'));
    console.log(chalk.gray('  • Ensure no processes are using the files'));
    throw error;
  }
}

/**
 * Get the total size of a directory recursively
 * @param {string} dirPath - Directory path
 * @returns {number} - Total size in bytes
 */
async function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        totalSize += await getDirectorySize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    // Ignore errors for individual files/directories
  }
  
  return totalSize;
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - Bytes to format
 * @returns {string} - Formatted string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Clean specific artifact types
 * @param {Array} types - Types to clean: 'compilation', 'setup', 'proofs', 'all'
 */
async function cleanSpecific(types = ['all']) {
  const spinner = ora('Cleaning specific artifacts...').start();
  
  try {
    const circuitsDir = path.join(__dirname, '../../circuits');
    
    const artifactGroups = {
      compilation: [
        'zkDutchAuction.r1cs',
        'zkDutchAuction.sym', 
        'zkDutchAuction_js',
        'zkDutchAuction_cpp'
      ],
      setup: [
        'circuit_final.zkey',
        'verification_key.json',
        '../contracts/Verifier.sol'
      ],
      proofs: [
        'proofs',
        'inputs'
      ],
      ptau: fs.readdirSync(circuitsDir).filter(f => f.endsWith('.ptau'))
    };

    let artifactsToClean = [];
    
    if (types.includes('all')) {
      artifactsToClean = [
        ...artifactGroups.compilation,
        ...artifactGroups.setup,
        ...artifactGroups.proofs,
        ...artifactGroups.ptau
      ];
    } else {
      for (const type of types) {
        if (artifactGroups[type]) {
          artifactsToClean.push(...artifactGroups[type]);
        }
      }
    }

    let cleanedCount = 0;
    for (const artifact of artifactsToClean) {
      const artifactPath = path.join(circuitsDir, artifact);
      
      if (fs.existsSync(artifactPath)) {
        const stats = fs.statSync(artifactPath);
        
        if (stats.isDirectory()) {
          fs.rmSync(artifactPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(artifactPath);
        }
        
        cleanedCount++;
        spinner.text = `Cleaned: ${artifact}`;
      }
    }

    spinner.succeed(`Cleaned ${cleanedCount} artifacts for types: ${types.join(', ')}`);

  } catch (error) {
    spinner.fail(`Specific cleanup failed: ${error.message}`);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Clean specific types
    cleanSpecific(args)
      .then(() => {
        console.log(chalk.green('\n🎉 Specific cleanup completed!'));
        process.exit(0);
      })
      .catch((error) => {
        console.error(chalk.red('❌ Cleanup failed:'), error.message);
        process.exit(1);
      });
  } else {
    // Clean all
    cleanArtifacts()
      .then(() => {
        console.log(chalk.green('\n🎉 Full cleanup completed!'));
        process.exit(0);
      })
      .catch((error) => {
        console.error(chalk.red('❌ Cleanup failed:'), error.message);
        process.exit(1);
      });
  }
}

module.exports = {
  cleanArtifacts,
  cleanSpecific,
  getDirectorySize,
  formatBytes
}; 