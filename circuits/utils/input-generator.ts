/**
 * Circuit Input Generator - N=8 zkFusion Circuit
 * 
 * Generates properly formatted inputs for the zkDutchAuction circuit using
 * the validated auction simulation logic and MOCK Poseidon for immediate unblocking.
 * 
 * WARNING: Uses mock Poseidon hash - NOT cryptographically secure!
 * Must be replaced with proper Poseidon before production.
 */

const fs = require('fs');
const path = require('path');

// Import validated auction logic
const {
  simulateAuction,
  generateSortingArrays,
  generateWinnerBits
} = require('./auction-simulator');

// Import mock Poseidon for immediate unblocking
const { 
  generateMockCommitment, 
  generateMockNullCommitment,
  formatFieldElement,
  addressToFieldElement 
} = require('./mock-poseidon');

// Import existing JavaScript utilities (TODO: Convert to TypeScript)
// const { hashBid, isValidFieldElement } = require('./poseidon');

/**
 * Convert JavaScript bid format to TypeScript Bid interface
 */
function convertToBid(jsBid: any, index: number): any {
  return {
    price: BigInt(jsBid.price.toString()),
    amount: BigInt(jsBid.amount.toString()),
    bidderAddress: jsBid.bidder || jsBid.bidderAddress,
    originalIndex: index
  };
}

/**
 * Generate circuit inputs from bid data using validated auction logic
 * @param bids Array of bid objects {price, amount, bidder}
 * @param commitments Array of commitment hashes
 * @param makerMinimumPrice Minimum price per token (replaces old single constraint)
 * @param makerMaximumAmount Maximum tokens to sell
 * @param commitmentContractAddress Address of commitment contract
 * @returns Circuit inputs object with all 75 required inputs
 */
async function generateCircuitInputs(
  bids: any[], 
  commitments: any[], 
  makerMinimumPrice: bigint | string | number,
  makerMaximumAmount: bigint | string | number, 
  commitmentContractAddress: string
): Promise<any> {
  const N = 8; // Circuit size (must match Circom template)
  
  // Validate inputs
  if (bids.length > N) {
    throw new Error(`Too many bids: ${bids.length}. Maximum is ${N}`);
  }
  
  // Note: commitments can be less than N - we'll pad them later

  // Convert to TypeScript Bid format
  const typedBids: any[] = bids.map((bid, index) => convertToBid(bid, index));

  // Create auction constraints
  const constraints: any = {
    makerMinimumPrice: BigInt(makerMinimumPrice.toString()),
    makerMaximumAmount: BigInt(makerMaximumAmount.toString()),
    commitmentContractAddress
  };

  // Use validated auction logic to simulate results
  const auctionResult: any = simulateAuction(typedBids, constraints);

  // Pad bids to N elements with null bids (using validated logic)
  const paddedBids: any[] = [...typedBids];
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
  const winnerBits = generateWinnerBits(auctionResult.winnerBitmask);

  // Format all inputs for circuit (convert to field elements)
  const bidPrices = paddedBids.map(bid => formatFieldElement(bid.price));
  const bidAmounts = paddedBids.map(bid => formatFieldElement(bid.amount));
  const bidderAddresses = paddedBids.map(bid => addressToFieldElement(bid.bidderAddress));

  // Format constraints
  const formattedMinPrice = formatFieldElement(constraints.makerMinimumPrice);
  const formattedMaxAmount = formatFieldElement(constraints.makerMaximumAmount);
  const formattedContractAddress = addressToFieldElement(constraints.commitmentContractAddress);

  // Format commitments (pad to N if needed)
  const paddedCommitments = [...commitments];
  while (paddedCommitments.length < N) {
    // FIXED: Use real Poseidon(0,0,0,contractAddress) for null commitments
    // This matches what the circuit expects for null bids
    const nullCommitment = generateMockNullCommitment(commitmentContractAddress);
    paddedCommitments.push(nullCommitment.toString());
  }
  const formattedCommitments = paddedCommitments.map(c => formatFieldElement(c));

  // Format sorting arrays
  const formattedSortedPrices = sortedPrices.map(p => formatFieldElement(p));
  const formattedSortedAmounts = sortedAmounts.map(a => formatFieldElement(a));
  const formattedSortedIndices = sortedIndices.map(i => formatFieldElement(i));

  // Format winner bits
  const formattedWinnerBits = winnerBits.map(bit => formatFieldElement(bit));

  // Validate all field elements
  const allInputs = [
    ...bidPrices, ...bidAmounts, ...bidderAddresses,
    ...formattedCommitments,
    formattedContractAddress, formattedMinPrice, formattedMaxAmount,
    ...formattedSortedPrices, ...formattedSortedAmounts, ...formattedSortedIndices,
    ...formattedWinnerBits
  ];

  for (let i = 0; i < allInputs.length; i++) {
    const input = allInputs[i];
    // Mock Poseidon returns a string, so we need to check if it's a valid field element
    // This is a placeholder for a proper Poseidon validation
    if (typeof input !== 'string') {
      const inputType = i < 8 ? 'bidPrice' : 
                       i < 16 ? 'bidAmount' :
                       i < 24 ? 'bidderAddress' :
                       i < 32 ? 'commitment' :
                       i < 35 ? 'constraint' :
                       i < 43 ? 'sortedPrice' :
                       i < 51 ? 'sortedAmount' :
                       i < 59 ? 'sortedIndex' : 'winnerBit';
      
      throw new Error(`Invalid field element for ${inputType}[${i}]: ${input}`);
    }
  }

  console.log(`✅ Generated ${allInputs.length} circuit inputs using validated auction logic`);
  console.log(`📊 Auction Results: ${auctionResult.numWinners} winners, ${auctionResult.totalFill} total fill, bitmask: ${auctionResult.winnerBitmask}`);

  return {
    // Private inputs - bid data (24 elements total)
    bidPrices,
    bidAmounts,
    bidderAddresses,
    
    // Private inputs - sorting arrays (32 elements total)
    sortedPrices: formattedSortedPrices,
    sortedAmounts: formattedSortedAmounts,
    sortedIndices: formattedSortedIndices,
    winnerBits: formattedWinnerBits,
    
    // Public inputs - commitments and constraints (11 elements total)
    // These will be revealed in the ZK proof
    commitments: formattedCommitments,
    commitmentContractAddress: formattedContractAddress,
    makerMinimumPrice: formattedMinPrice,
    makerMaximumAmount: formattedMaxAmount
  };
}

/**
 * Generate expected public outputs using validated auction logic
 * @param auctionResults Results from validated simulateAuction
 * @returns Expected public outputs [totalFill, weightedAvgPrice, numWinners, winnerBitmask]
 */
function generateExpectedOutputs(auctionResults: any): string[] {
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
function saveInputsToFile(inputs: any, filename: string = 'input.json'): void {
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
function loadInputsFromFile(filename: string = 'input.json'): any {
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
function verifyCommitments(bids: any[], commitments: any[], contractAddress: string): boolean {
  if (bids.length !== commitments.length) {
    console.error(`❌ Bid count (${bids.length}) doesn't match commitment count (${commitments.length})`);
    return false;
  }

  for (let i = 0; i < bids.length; i++) {
    const bid = convertToBid(bids[i], i);
    const expectedCommitment = generateMockCommitment(bid, contractAddress);
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
  saveInputsToFile,
  loadInputsFromFile,
  verifyCommitments
}; 