/**
 * zkFusion Auction Simulator
 * 
 * Pure auction logic implementation for zkFusion Dutch auctions.
 * This is the single source of truth for auction algorithm behavior.
 * 
 * Used by:
 * - Functional tests for validation
 * - Input generator for circuit data creation
 * - Future auction runner implementations
 */

const { CIRCUIT_CONFIG } = require('./types');

/**
 * Simulate the zkFusion auction algorithm
 * @param bids Array of bids to process
 * @param constraints Auction constraints (price and quantity limits)
 * @returns Auction results with winners and statistics
 */
function simulateAuction(bids: any[], constraints: any): any {
  const N = CIRCUIT_CONFIG.N_MAX_BIDS; // Fixed circuit size for zkFusion
  
  // Pad bids to N elements with null bids
  const paddedBids: any[] = [...bids];
  while (paddedBids.length < N) {
    paddedBids.push({
      price: 0n,
      amount: 0n,
      bidderAddress: '0x0000000000000000000000000000000000000000',
      originalIndex: paddedBids.length
    });
  }
  
  // Sort bids by price (descending) - Dutch auction
  const sortedBids = [...paddedBids].sort((a, b) => {
    if (a.price > b.price) return -1;
    if (a.price < b.price) return 1;
    return 0;
  });
  
  // Greedy fill algorithm with dual constraints
  const winners: any[] = [];
  let totalFill = 0n;
  let totalValue = 0n;
  let winnerBitmask = 0;
  
  for (let i = 0; i < sortedBids.length; i++) {
    const bid = sortedBids[i];
    
    // Skip null bids (price = 0)
    if (bid.price === 0n) continue;
    
    // Check dual constraints
    const fitsQuantity = totalFill + bid.amount < constraints.makerMaximumAmount; // Strict less-than
    const meetsPrice = bid.price >= constraints.makerMinimumPrice;
    
    if (fitsQuantity && meetsPrice) {
      winners.push(bid);
      totalFill += BigInt(bid.amount);
      totalValue += bid.price * BigInt(bid.amount);
      winnerBitmask |= (1 << Number(bid.originalIndex));
    }
  }
  
  // Calculate weighted average price
  const weightedAvgPrice = winners.length > 0 ? totalValue / totalFill : 0n;
  
  return {
    winners,
    numWinners: BigInt(winners.length),
    totalFill,
    totalValue,
    weightedAvgPrice,
    winnerBitmask
  };
}

/**
 * Generate sorting arrays for circuit input
 * @param bids Array of bids (already padded to N)
 * @returns Sorting arrays for circuit input
 */
function generateSortingArrays(bids: any[]) {
  const N = 8;
  
  // Sort by price descending (Dutch auction)
  const sortedBids = [...bids].sort((a, b) => {
    if (a.price > b.price) return -1;
    if (a.price < b.price) return 1;
    return 0;
  });
  
  // Extract arrays
  const sortedPrices = sortedBids.map((bid: any) => bid.price);
  const sortedAmounts = sortedBids.map((bid: any) => bid.amount);
  const sortedIndices = sortedBids.map((bid: any) => BigInt(bid.originalIndex));
  
  return { sortedPrices, sortedAmounts, sortedIndices };
}

/**
 * Generate winner bits array from bitmask
 * @param winnerBitmask Bitmask representing winners
 * @returns Array of 8 winner bits (0 or 1)
 */
function generateWinnerBits(winnerBitmask: number): number[] {
  const N = 8;
  const winnerBits: number[] = [];
  
  for (let i = 0; i < N; i++) {
    winnerBits.push((winnerBitmask & (1 << i)) ? 1 : 0);
  }
  
  return winnerBits;
}

/**
 * Utility function to format bigint as ETH for readable output
 */
function formatEther(value: bigint): string {
  const eth = Number(value) / 1e18;
  return eth.toFixed(6);
}

// CommonJS exports
module.exports = {
  simulateAuction,
  generateSortingArrays,
  generateWinnerBits,
  formatEther
}; 