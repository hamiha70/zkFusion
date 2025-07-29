const { hashBid, formatFieldElement, isValidFieldElement, addressToFieldElement } = require('./poseidon');
const fs = require('fs');
const path = require('path');

/**
 * Generate sorting arrays for ZK circuit verification
 * @param {Array} bids - Array of bid objects (already padded to N elements)
 * @returns {Object} - {sortedPrices, sortedAmounts, sortedIndices}
 */
function generateSortingArrays(bids) {
  const N = bids.length;
  
  // Create array with original indices
  const bidsWithIndices = bids.map((bid, originalIndex) => ({
    ...bid,
    originalIndex
  }));
  
  // Sort by price descending (null bids with price=0 will sort to end)
  const sortedBidsWithIndices = bidsWithIndices.sort((a, b) => {
    const priceA = BigInt(a.price.toString());
    const priceB = BigInt(b.price.toString());
    return priceB > priceA ? 1 : priceB < priceA ? -1 : 0;
  });
  
  // Extract sorted arrays
  const sortedPrices = sortedBidsWithIndices.map(bid => formatFieldElement(bid.price));
  const sortedAmounts = sortedBidsWithIndices.map(bid => formatFieldElement(bid.amount));
  const sortedIndices = sortedBidsWithIndices.map(bid => formatFieldElement(bid.originalIndex));
  
  return {
    sortedPrices,
    sortedAmounts,
    sortedIndices
  };
}

/**
 * Generate circuit inputs from bid data
 * @param {Array} bids - Array of bid objects {price, amount, nonce, bidder}
 * @param {Array} commitments - Array of commitment hashes
 * @param {BigInt|string|number} makerAsk - Maximum amount maker wants to receive
 * @param {string} commitmentContractAddress - Address of commitment contract
 * @returns {Object} - Circuit inputs object
 */
async function generateCircuitInputs(bids, commitments, makerAsk, commitmentContractAddress) {
  const N = 8; // Circuit size (must match Circom template)
  
  // Validate inputs
  if (bids.length > N) {
    throw new Error(`Too many bids. Maximum ${N} bids supported.`);
  }
  
  if (commitments.length !== N) {
    throw new Error(`Commitments array must have exactly ${N} elements.`);
  }

  // Pad bids to N elements
  const paddedBids = [...bids];
  while (paddedBids.length < N) {
    paddedBids.push({
      price: 0n,
      amount: 0n,
      nonce: 0n,
      bidder: "0x0000000000000000000000000000000000000000"
    });
  }

  // Extract arrays for circuit
  const bidPrices = paddedBids.map(bid => formatFieldElement(bid.price));
  const bidAmounts = paddedBids.map(bid => formatFieldElement(bid.amount));
  const nonces = paddedBids.map(bid => formatFieldElement(bid.nonce));
  
  // Format commitments and other inputs
  const formattedCommitments = commitments.map(c => formatFieldElement(c));
  const formattedMakerAsk = formatFieldElement(makerAsk);
  const formattedContractAddress = addressToFieldElement(commitmentContractAddress);

  // Validate all field elements
  const allInputs = [
    ...bidPrices,
    ...bidAmounts,
    ...nonces,
    ...formattedCommitments,
    formattedMakerAsk,
    formattedContractAddress
  ];

  for (let i = 0; i < allInputs.length; i++) {
    const input = allInputs[i];
    if (!isValidFieldElement(input)) {
      // Add debugging info to identify which input is problematic
      let inputType = 'unknown';
      if (i < bidPrices.length) inputType = `bidPrice[${i}]`;
      else if (i < bidPrices.length + bidAmounts.length) inputType = `bidAmount[${i - bidPrices.length}]`;
      else if (i < bidPrices.length + bidAmounts.length + nonces.length) inputType = `nonce[${i - bidPrices.length - bidAmounts.length}]`;
      else if (i < bidPrices.length + bidAmounts.length + nonces.length + formattedCommitments.length) inputType = `commitment[${i - bidPrices.length - bidAmounts.length - nonces.length}]`;
      else if (i === allInputs.length - 2) inputType = 'makerAsk';
      else if (i === allInputs.length - 1) inputType = 'contractAddress';
      
      throw new Error(`Invalid field element for ${inputType}: ${input}`);
    }
  }

  // Generate sorting arrays for ZK circuit
  const { sortedPrices, sortedAmounts, sortedIndices } = generateSortingArrays(paddedBids);

  return {
    // Private inputs (revealed bids)
    bidPrices,
    bidAmounts,
    nonces,
    
    // Private inputs (sorting-related)
    sortedPrices,
    sortedAmounts,
    sortedIndices,
    
    // Private inputs (previously public, now private for zero-knowledge)
    commitments: formattedCommitments,
    makerAsk: formattedMakerAsk,
    commitmentContractAddress: formattedContractAddress
  };
}

/**
 * Simulate auction logic to determine winners
 * @param {Array} bids - Array of bid objects (with originalIndex property)
 * @param {BigInt|string|number} makerAsk - Maximum amount to fill
 * @returns {Object} - Auction results including winner bitmask
 */
function simulateAuction(bids, makerAsk) {
  const N = 8; // Fixed circuit size
  
  // Sort bids by price descending, preserving original indices
  const sortedBids = [...bids].map((bid, index) => ({
    ...bid,
    originalIndex: index
  })).sort((a, b) => {
    const priceA = BigInt(a.price.toString());
    const priceB = BigInt(b.price.toString());
    return priceB > priceA ? 1 : priceB < priceA ? -1 : 0;
  });

  let totalFill = 0n;
  let totalWeighted = 0n;
  const winners = [];
  let winnerBitmask = 0;
  const maxFill = BigInt(makerAsk.toString());

  for (const bid of sortedBids) {
    const price = BigInt(bid.price.toString());
    const amount = BigInt(bid.amount.toString());
    
    if (totalFill + amount <= maxFill) {
      totalFill += amount;
      totalWeighted += price * amount;
      winners.push(bid);
      
      // Set bit for this winner's original position
      winnerBitmask |= (1 << bid.originalIndex);
    }
  }

  const weightedAvgPrice = totalFill > 0n ? totalWeighted / totalFill : 0n;
  const numWinners = winners.length;

  return {
    winners,
    totalFill,
    weightedAvgPrice,
    totalWeighted,
    numWinners,
    winnerBitmask
  };
}

/**
 * Generate expected public outputs for circuit
 * @param {Object} auctionResults - Results from simulateAuction
 * @returns {Array} - Expected public outputs [totalFill, weightedAvgPrice, numWinners, winnerBitmask]
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
 * @param {Object} inputs - Circuit inputs
 * @param {string} filename - Output filename
 */
function saveInputsToFile(inputs, filename = 'input.json') {
  const inputsDir = path.join(__dirname, '../inputs');
  if (!fs.existsSync(inputsDir)) {
    fs.mkdirSync(inputsDir, { recursive: true });
  }
  
  const filepath = path.join(inputsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(inputs, null, 2));
  console.log(`Circuit inputs saved to: ${filepath}`);
}

/**
 * Load circuit inputs from JSON file
 * @param {string} filename - Input filename
 * @returns {Object} - Circuit inputs
 */
function loadInputsFromFile(filename = 'input.json') {
  const filepath = path.join(__dirname, '../inputs', filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Input file not found: ${filepath}`);
  }
  
  const content = fs.readFileSync(filepath, 'utf8');
  return JSON.parse(content);
}

/**
 * Verify bid commitments match the provided hashes
 * @param {Array} bids - Array of bid objects
 * @param {Array} commitments - Array of commitment hashes
 * @returns {boolean} - True if all commitments match
 */
async function verifyCommitments(bids, commitments) {
  for (let i = 0; i < bids.length; i++) {
    const bid = bids[i];
    const expectedHash = await hashBid(bid.price, bid.amount, bid.nonce);
    const providedHash = commitments[i].toString();
    
    if (expectedHash !== providedHash) {
      console.error(`Commitment mismatch at index ${i}:`);
      console.error(`  Expected: ${expectedHash}`);
      console.error(`  Provided: ${providedHash}`);
      return false;
    }
  }
  return true;
}

module.exports = {
  generateCircuitInputs,
  simulateAuction,
  generateExpectedOutputs,
  saveInputsToFile,
  loadInputsFromFile,
  verifyCommitments
}; 