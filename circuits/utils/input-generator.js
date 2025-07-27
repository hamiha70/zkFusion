const { hashBid, formatFieldElement, isValidFieldElement, addressToFieldElement } = require('./poseidon');
const fs = require('fs');
const path = require('path');

/**
 * Generate circuit inputs from bid data
 * @param {Array} bids - Array of bid objects {price, amount, nonce, bidder}
 * @param {Array} commitments - Array of commitment hashes
 * @param {BigInt|string|number} makerAsk - Maximum amount maker wants to receive
 * @param {string} commitmentContractAddress - Address of commitment contract
 * @returns {Object} - Circuit inputs object
 */
async function generateCircuitInputs(bids, commitments, makerAsk, commitmentContractAddress) {
  const N = 4; // Circuit size (must match Circom template)
  
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

  return {
    bidPrices,
    bidAmounts,
    nonces,
    commitments: formattedCommitments,
    makerAsk: formattedMakerAsk,
    commitmentContractAddress: formattedContractAddress
  };
}

/**
 * Simulate auction logic to determine winners
 * @param {Array} bids - Array of bid objects
 * @param {BigInt|string|number} makerAsk - Maximum amount to fill
 * @returns {Object} - Auction results
 */
function simulateAuction(bids, makerAsk) {
  // Sort bids by price descending
  const sortedBids = [...bids].sort((a, b) => {
    const priceA = BigInt(a.price.toString());
    const priceB = BigInt(b.price.toString());
    return priceB > priceA ? 1 : priceB < priceA ? -1 : 0;
  });

  let totalFill = 0n;
  let totalWeighted = 0n;
  const winners = [];
  const maxFill = BigInt(makerAsk.toString());

  for (const bid of sortedBids) {
    const price = BigInt(bid.price.toString());
    const amount = BigInt(bid.amount.toString());
    
    if (totalFill + amount <= maxFill) {
      totalFill += amount;
      totalWeighted += price * amount;
      winners.push(bid);
    }
  }

  const weightedAvgPrice = totalFill > 0n ? totalWeighted / totalFill : 0n;

  return {
    winners,
    totalFill,
    weightedAvgPrice,
    totalWeighted
  };
}

/**
 * Generate expected public outputs for circuit
 * @param {Object} auctionResults - Results from simulateAuction
 * @param {Array} commitments - All commitments (padded to N)
 * @param {BigInt|string|number} makerAsk - Maker ask amount
 * @param {string} commitmentContractAddress - Contract address
 * @returns {Array} - Expected public outputs
 */
function generateExpectedOutputs(auctionResults, commitments, makerAsk, commitmentContractAddress) {
  const N = 4;
  
  // Create winning commitments array (only winners have non-zero commitments in output)
  const winningCommitments = new Array(N).fill('0');
  
  // Map winners to their commitment positions
  for (let i = 0; i < auctionResults.winners.length && i < N; i++) {
    // Find the commitment index for this winner
    // This is simplified - in practice, you'd need to track the original indices
    winningCommitments[i] = formatFieldElement(commitments[i]);
  }

  return [
    ...winningCommitments,                                              // [0-3] winning commitments
    formatFieldElement(auctionResults.totalFill),                      // [4] totalFill
    formatFieldElement(auctionResults.weightedAvgPrice),               // [5] weightedAvgPrice  
    formatFieldElement(makerAsk),                                      // [6] makerAsk
    addressToFieldElement(commitmentContractAddress)                   // [7] contract address
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