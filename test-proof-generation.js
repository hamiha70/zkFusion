/**
 * Phase 1.5 Verification: Full Groth16 Proof Generation Test
 * 
 * This script tests the complete proof pipeline using the same inputs
 * that passed our circuit tests, to verify we can generate actual proofs.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import our tested utilities (same as in tests)
const { generateCircuitInputs } = require('./circuits/utils/input-generator');
const { simulateAuction } = require('./circuits/utils/auction-simulator');

async function testFullProofGeneration() {
    console.log('🚀 Phase 1.5: Testing Full Groth16 Proof Generation');
    console.log('==================================================');
    
    try {
        // Step 1: Extract verification key using CLI
        console.log('\n📋 Step 1: Extracting verification key...');
        try {
            execSync('npx snarkjs zkey export verificationkey ./dist/zkDutchAuction8_0000.zkey ./dist/verification_key.json', 
                { stdio: 'inherit' });
            console.log('✅ Verification key extracted to ./dist/verification_key.json');
        } catch (error) {
            console.error('❌ Failed to extract verification key:', error.message);
            throw error;
        }
        
        // Step 2: Use EXACT same inputs as passing test (identity permutation)
        console.log('\n📋 Step 2: Generating test inputs (same as passing test)...');
        
        const bids = [
            { price: 1000n, amount: 100n, bidderAddress: '0x1234567890abcdef1234567890abcdef12345678' },
            { price: 800n, amount: 150n, bidderAddress: '0xabcdef1234567890abcdef123456789012345678' },
            { price: 600n, amount: 200n, bidderAddress: '0x1122334455667788990011223344556677889900' },
            { price: 400n, amount: 250n, bidderAddress: '0x12345678901234567890123456789012345678ab' }
        ];
        
        const constraints = {
            makerMinimumPrice: 0n,
            makerMaximumAmount: 500n  // Same as passing test
        };
        
        const contractAddress = '0x123456789';
        
        // Generate circuit inputs (same function as tests)
        const input = await generateCircuitInputs(bids, [], constraints.makerMinimumPrice, constraints.makerMaximumAmount, contractAddress);
        console.log('✅ Circuit inputs generated:', Object.keys(input).length, 'fields');
        
        // Calculate expected outputs (same function as tests)
        const expectedResult = simulateAuction(bids, constraints);
        console.log('✅ Expected outputs calculated:');
        console.log('   totalFill:', expectedResult.totalFill);
        console.log('   totalValue:', expectedResult.totalValue);
        console.log('   numWinners:', expectedResult.numWinners);
        
        // Step 3: Save input for witness generation
        console.log('\n📋 Step 3: Saving circuit input...');
        fs.writeFileSync('./dist/input.json', JSON.stringify(input, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2));
        console.log('✅ Input saved to ./dist/input.json');
        
        // Step 4: Generate witness using CLI
        console.log('\n📋 Step 4: Generating witness...');
        const startWitness = Date.now();
        try {
            execSync('npx snarkjs wtns calculate ./dist/zkDutchAuction8_js/zkDutchAuction8.wasm ./dist/input.json ./dist/witness.wtns', 
                { stdio: 'inherit' });
            const witnessTime = Date.now() - startWitness;
            console.log(`✅ Witness generated in ${witnessTime}ms`);
        } catch (error) {
            console.error('❌ Failed to generate witness:', error.message);
            throw error;
        }
        
        // Step 5: Generate Groth16 proof using CLI
        console.log('\n📋 Step 5: Generating Groth16 proof...');
        const startProof = Date.now();
        try {
            execSync('npx snarkjs groth16 prove ./dist/zkDutchAuction8_0000.zkey ./dist/witness.wtns ./dist/proof.json ./dist/public.json', 
                { stdio: 'inherit' });
            const proofTime = Date.now() - startProof;
            console.log(`✅ Proof generated in ${proofTime}ms`);
        } catch (error) {
            console.error('❌ Failed to generate proof:', error.message);
            throw error;
        }
        
        // Step 6: Verify the proof using CLI
        console.log('\n📋 Step 6: Verifying proof...');
        const startVerify = Date.now();
        try {
            execSync('npx snarkjs groth16 verify ./dist/verification_key.json ./dist/public.json ./dist/proof.json', 
                { stdio: 'inherit' });
            const verifyTime = Date.now() - startVerify;
            console.log(`✅ Proof verification completed in ${verifyTime}ms`);
        } catch (error) {
            console.error('❌ Proof verification failed:', error.message);
            throw error;
        }
        
        // Step 7: Load and validate outputs
        console.log('\n📋 Step 7: Validating proof outputs...');
        
        const publicSignals = JSON.parse(fs.readFileSync('./dist/public.json', 'utf8'));
        console.log('Public Signals from Proof:', publicSignals);
        console.log('Expected Outputs:');
        console.log('   totalFill:', expectedResult.totalFill.toString());
        console.log('   totalValue:', expectedResult.totalValue.toString());
        console.log('   numWinners:', expectedResult.numWinners.toString());
        
        // Check if outputs match (allowing for string/bigint conversion)
        const outputsMatch = (
            publicSignals[0] === expectedResult.totalFill.toString() &&
            publicSignals[1] === expectedResult.totalValue.toString() &&
            publicSignals[2] === expectedResult.numWinners.toString()
        );
        
        // Calculate total time (approximate since we used CLI)
        const totalTime = Date.now() - startWitness;
        
        // Final Results
        console.log('\n🎯 PHASE 1.5 RESULTS:');
        console.log('====================');
        console.log(`✅ Verification Key: Generated successfully`);
        console.log(`✅ Witness Generation: Completed`);
        console.log(`✅ Proof Generation: Completed`);
        console.log(`✅ Proof Verification: Completed`);
        console.log(`✅ Proof Valid: YES (CLI verification passed)`);
        console.log(`✅ Outputs Match: ${outputsMatch ? 'YES' : 'NO'}`);
        
        console.log(`\n⏱️  Total Pipeline Time: ~${totalTime}ms`);
        
        if (outputsMatch) {
            console.log('\n🎉 SUCCESS: Full proof generation pipeline works!');
            console.log('🚀 CONFIDENCE LEVEL: 95% - Ready for demo!');
            console.log('\n📋 Generated Files:');
            console.log('   - ./dist/verification_key.json (for contract deployment)');
            console.log('   - ./dist/proof.json (example proof)');
            console.log('   - ./dist/public.json (example public signals)');
            console.log('   - ./dist/input.json (example circuit input)');
            return true;
        } else {
            console.log('\n❌ FAILURE: Proof outputs do not match expected values');
            console.log('⚠️  CONFIDENCE LEVEL: Still at 70% - Need debugging');
            return false;
        }
        
    } catch (error) {
        console.error('\n❌ CRITICAL ERROR in proof generation:');
        console.error(error.message || error);
        console.log('\n⚠️  CONFIDENCE LEVEL: Back to 70% - Need investigation');
        return false;
    }
}

// Run the test
if (require.main === module) {
    testFullProofGeneration()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { testFullProofGeneration }; 