/**
 * ZK Circuit Input Generator - Updated to use Validated Auction Logic
 * 
 * This module generates inputs for the zkDutchAuction circuit using the
 * validated auction logic from auction-simulator.ts to ensure consistency.
 */

import * as fs from 'fs';
import * as path from 'path';

// Import validated auction logic
import { 
  simulateAuction,
  generateSortingArrays,
  generateWinnerBits,
  type Bid,
  type AuctionConstraints,
  type AuctionResult
} from './auction-simulator';

import { generateCommitment } from './hash-utils';

// Import existing JavaScript utilities (TODO: Convert to TypeScript)
const { hashBid, formatFieldElement, isValidFieldElement, addressToFieldElement } = require('./poseidon');

/**
 * Convert JavaScript bid format to TypeScript Bid interface
 */
function convertToBid(jsBid: any, index: number): Bid {
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
export async function generateCircuitInputs(
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
  const typedBids: Bid[] = bids.map((bid, index) => convertToBid(bid, index));

  // Create auction constraints
  const constraints: AuctionConstraints = {
    makerMinimumPrice: BigInt(makerMinimumPrice.toString()),
    makerMaximumAmount: BigInt(makerMaximumAmount.toString()),
    commitmentContractAddress
  };

  // Use validated auction logic to simulate results
  const auctionResult: AuctionResult = simulateAuction(typedBids, constraints);

  // Pad bids to N elements with null bids (using validated logic)
  const paddedBids: Bid[] = [...typedBids];
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
    // Use Poseidon(0,0,0) for null commitments as per spec
    paddedCommitments.push('0'); // TODO: Replace with actual Poseidon(0,0,0,contractAddress)
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
    if (!isValidFieldElement(input)) {
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
    // Private inputs - bid data (8 elements each)
    bidPrices,
    bidAmounts,
    bidderAddresses,
    
    // Private inputs - commitments (8 elements)
    commitments: formattedCommitments,
    
    // Private inputs - constraints (3 elements)
    commitmentContractAddress: formattedContractAddress,
    makerMinimumPrice: formattedMinPrice,
    makerMaximumAmount: formattedMaxAmount,
    
    // Private inputs - sorting arrays (8 elements each)
    sortedPrices: formattedSortedPrices,
    sortedAmounts: formattedSortedAmounts,
    sortedIndices: formattedSortedIndices,
    
    // Private inputs - winner bits (8 elements)
    winnerBits: formattedWinnerBits
  };
}

/**
 * Generate expected public outputs using validated auction logic
 * @param auctionResults Results from validated simulateAuction
 * @returns Expected public outputs [totalFill, weightedAvgPrice, numWinners, winnerBitmask]
 */
export function generateExpectedOutputs(auctionResults: AuctionResult): string[] {
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
export function saveInputsToFile(inputs: any, filename: string = 'input.json'): void {
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
export function loadInputsFromFile(filename: string = 'input.json'): any {
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
export function verifyCommitments(bids: any[], commitments: any[], contractAddress: string): boolean {
  if (bids.length !== commitments.length) {
    console.error(`❌ Bid count (${bids.length}) doesn't match commitment count (${commitments.length})`);
    return false;
  }

  for (let i = 0; i < bids.length; i++) {
    const bid = convertToBid(bids[i], i);
    const expectedCommitment = generateCommitment(bid, contractAddress);
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