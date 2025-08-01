/**
 * Circuit Input Generator - zkFusion Dutch Auction
 * 
 * Generates properly formatted inputs for the zkDutchAuction circuit.
 * Uses real Poseidon hashing via poseidon-lite for circuit compatibility.
 */

const { simulateAuction, generateSortingArrays, generateWinnerBits } = require('./auction-simulator');
const { formatFieldElement, addressToFieldElement } = require('./poseidon');
const { poseidon4 } = require('poseidon-lite');

/**
 * Convert bid object to internal Bid type with proper field types
 */
function convertToBid(bid, originalIndex) {
    return {
        price: BigInt(bid.price.toString()),
        amount: BigInt(bid.amount.toString()),
        bidderAddress: bid.bidder || bid.bidderAddress,
        originalIndex: originalIndex
    };
}

/**
 * Generate real commitment using poseidon-lite (matches circuit)
 */
function generateRealCommitment(bid, contractAddress) {
    // Convert addresses to field elements for hashing
    const bidderAddress = typeof bid.bidderAddress === 'string' ? bid.bidderAddress : bid.bidder;
    
    // Use the exact same format as the working hash-utils.ts implementation
    const inputs = [
        BigInt(bid.price),           // price
        BigInt(bid.amount),          // amount  
        BigInt(bidderAddress),       // bidder address (raw BigInt)
        BigInt(contractAddress)      // contract address (raw BigInt)
    ];
    
    // Use poseidon-lite which is compatible with circomlib
    const result = poseidon4(inputs);
    return result.toString();
}

/**
 * Generate real null commitment for padding (matches circuit expectation)
 */
function generateRealNullCommitment(contractAddress) {
    // For null bids, use zeros for price, amount, and bidder
    const inputs = [
        0n,                          // price: 0
        0n,                          // amount: 0  
        0n,                          // bidder address: 0
        BigInt(contractAddress)      // contract address (real)
    ];
    
    const result = poseidon4(inputs);
    return result.toString();
}

/**
 * Generate circuit inputs from bid data using validated auction logic
 * @param bids Array of bid objects {price, amount, bidder}
 * @param commitments Array of commitment hashes (if empty, will generate real commitments)
 * @param makerMinimumPrice Minimum price per token (replaces old single constraint)
 * @param makerMaximumAmount Maximum tokens to sell
 * @param commitmentContractAddress Address of commitment contract
 * @returns Circuit inputs object with all 75 required inputs
 */
async function generateCircuitInputs(bids, commitments, makerMinimumPrice, makerMaximumAmount, commitmentContractAddress) {
    const N = 8; // Circuit size (must match Circom template)
    // Validate inputs
    if (bids.length > N) {
        throw new Error(`Too many bids: ${bids.length}. Maximum is ${N}`);
    }
    
    // Convert to TypeScript Bid format
    const typedBids = bids.map((bid, index) => convertToBid(bid, index));
    
    // Create auction constraints
    const constraints = {
        makerMinimumPrice: BigInt(makerMinimumPrice.toString()),
        makerMaximumAmount: BigInt(makerMaximumAmount.toString()),
        commitmentContractAddress
    };
    
    // Use validated auction logic to simulate results
    const auctionResult = simulateAuction(typedBids, constraints);
    
    // Pad bids to N elements with null bids (using validated logic)
    const paddedBids = [...typedBids];
    while (paddedBids.length < N) {
        paddedBids.push({
            price: 0n,
            amount: 0n,
            bidderAddress: '0x0000000000000000000000000000000000000000',
            originalIndex: paddedBids.length
        });
    }
    
    // Generate sorting arrays using validated logic
    const { sortedPrices, sortedAmounts, sortedIndices } = generateSortingArrays(paddedBids);
    
    // Generate winner bits for circuit (individual bits, not bitmask)
    const originalWinnerBits = generateWinnerBits(auctionResult.winnerBitmask);
    
    // Generate sorted winner bits by applying the same permutation as the sorting
    const sortedWinnerBits = sortedIndices.map(originalIndex => originalWinnerBits[originalIndex]);
    
    // Format all inputs for circuit (convert to field elements)
    const bidPrices = paddedBids.map(bid => formatFieldElement(bid.price));
    const bidAmounts = paddedBids.map(bid => formatFieldElement(bid.amount));
    const bidderAddresses = paddedBids.map(bid => addressToFieldElement(bid.bidderAddress));
    
    // Format constraints
    const formattedMinPrice = formatFieldElement(constraints.makerMinimumPrice);
    const formattedMaxAmount = formatFieldElement(constraints.makerMaximumAmount);
    const formattedContractAddress = addressToFieldElement(constraints.commitmentContractAddress);
    
    // FIXED: Generate real commitments if not provided
    let realCommitments;
    if (commitments.length === 0) {
        // Generate real commitments for actual bids
        realCommitments = typedBids.map(bid => generateRealCommitment(bid, commitmentContractAddress));
        
        // Pad with real null commitments
        while (realCommitments.length < N) {
            realCommitments.push(generateRealNullCommitment(commitmentContractAddress));
        }
    } else {
        // Use provided commitments and pad if needed
        realCommitments = [...commitments];
        while (realCommitments.length < N) {
            realCommitments.push(generateRealNullCommitment(commitmentContractAddress));
        }
    }
    
    const formattedCommitments = realCommitments.map(c => formatFieldElement(c));
    
    // Format sorting arrays
    const formattedSortedPrices = sortedPrices.map(p => formatFieldElement(p));
    const formattedSortedAmounts = sortedAmounts.map(a => formatFieldElement(a));
    const formattedSortedIndices = sortedIndices.map(i => formatFieldElement(i));
    
    // Format winner bits (both original and sorted)
    const formattedOriginalWinnerBits = originalWinnerBits.map(bit => formatFieldElement(bit));
    const formattedSortedWinnerBits = sortedWinnerBits.map(bit => formatFieldElement(bit));
    
    // Validate all field elements
    const allInputs = [
        ...bidPrices,
        ...bidAmounts, 
        ...bidderAddresses,
        ...formattedCommitments,
        formattedMinPrice,
        formattedMaxAmount,
        formattedContractAddress,
        ...formattedSortedPrices,
        ...formattedSortedAmounts,
        ...formattedSortedIndices,
        ...formattedOriginalWinnerBits,
        ...formattedSortedWinnerBits
    ];
    
    console.log(`✅ Generated ${allInputs.length} circuit inputs using validated auction logic (expected: 75)`);
    
    // Return circuit inputs in the exact format expected by zkDutchAuction.circom
    return {
        // Bid data (8 elements each)
        bidPrices: bidPrices,
        bidAmounts: bidAmounts,
        bidderAddresses: bidderAddresses,
        commitments: formattedCommitments,
        
        // Constraints (1 element each)
        makerMinimumPrice: formattedMinPrice,
        makerMaximumAmount: formattedMaxAmount,
        commitmentContractAddress: formattedContractAddress,
        
        // Sorting verification (8 elements each)
        sortedPrices: formattedSortedPrices,
        sortedAmounts: formattedSortedAmounts,
        sortedIndices: formattedSortedIndices,
        
        // Winner verification (8 elements each)
        originalWinnerBits: formattedOriginalWinnerBits,
        sortedWinnerBits: formattedSortedWinnerBits
    };
}
/**
 * Generate expected public outputs using validated auction logic
 * @param auctionResults Results from validated simulateAuction
 * @returns Expected public outputs [totalFill, weightedAvgPrice, numWinners, winnerBitmask]
 */
function generateExpectedOutputs(auctionResults) {
    return [
        auctionResults.totalFill.toString(),
        auctionResults.weightedAvgPrice.toString(),
        auctionResults.numWinners.toString(),
        auctionResults.winnerBitmask.toString()
    ];
}
/**
 * Save circuit inputs to JSON file
 */
function saveInputsToFile(inputs, filename = 'input.json') {
    const inputsDir = path.join(__dirname, '../inputs');
    if (!fs.existsSync(inputsDir)) {
        fs.mkdirSync(inputsDir, { recursive: true });
    }
    const filepath = path.join(inputsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(inputs, null, 2));
    console.log(`💾 Circuit inputs saved to: ${filepath}`);
}
/**
 * Load circuit inputs from JSON file
 */
function loadInputsFromFile(filename = 'input.json') {
    const filepath = path.join(__dirname, '../inputs', filename);
    if (!fs.existsSync(filepath)) {
        throw new Error(`Input file not found: ${filepath}`);
    }
    const data = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(data);
}
/**
 * Verify commitments match bid data using validated logic
 */
function verifyCommitments(bids, commitments, contractAddress) {
    if (bids.length !== commitments.length) {
        console.error(`❌ Bid count (${bids.length}) doesn't match commitment count (${commitments.length})`);
        return false;
    }
    for (let i = 0; i < bids.length; i++) {
        const bid = convertToBid(bids[i], i);
        const expectedCommitment = generateRealCommitment(bid, contractAddress);
        const actualCommitment = BigInt(commitments[i].toString());
        if (expectedCommitment !== actualCommitment) {
            console.error(`❌ Commitment mismatch at index ${i}:`);
            console.error(`   Expected: ${expectedCommitment}`);
            console.error(`   Actual: ${actualCommitment}`);
            return false;
        }
    }
    console.log(`✅ All ${bids.length} commitments verified using validated hash logic`);
    return true;
}
// Legacy exports for backward compatibility
module.exports = {
    generateCircuitInputs,
    generateExpectedOutputs,
    generateRealCommitment,
    saveInputsToFile,
    loadInputsFromFile,
    verifyCommitments
};
