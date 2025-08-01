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
const { BN254_PRIME, isFieldElement, FieldElementError, CIRCUIT_CONFIG } = require('./types');
/**
 * Simulate the zkFusion auction algorithm
 *
 * This implements the core Dutch auction logic:
 * 1. Pad bids to N=8 elements with null bids
 * 2. Sort bids by price descending (highest first)
 * 3. Apply greedy fill with dual constraints
 * 4. Calculate results and winner bitmask
 *
 * @param bids Array of bid objects
 * @param constraints Auction constraints (price + quantity limits)
 * @returns Auction results with winners and statistics
 */
function simulateAuction(bids, constraints) {
    const N = CIRCUIT_CONFIG.N_MAX_BIDS; // Fixed circuit size for zkFusion
    // Pad bids to N elements with null bids
    const paddedBids = [...bids];
    while (paddedBids.length < N) {
        paddedBids.push({
            price: 0n,
            amount: 0n,
            bidderAddress: '0x0000000000000000000000000000000000000000',
            originalIndex: paddedBids.length
        });
    }
    // Ensure original indices are set correctly
    paddedBids.forEach((bid, index) => {
        bid.originalIndex = index;
    });
    // Sort bids by price descending (Dutch auction - highest price wins first)
    const sortedBids = [...paddedBids].sort((a, b) => {
        return a.price > b.price ? -1 : a.price < b.price ? 1 : 0;
    });
    // Greedy fill algorithm with dual constraints
    const winners = [];
    let totalFill = 0n;
    let totalValue = 0n;
    let winnerBitmask = 0;
    for (const bid of sortedBids) {
        // Skip null bids (padding)
        if (bid.price === 0n)
            continue;
        // Apply dual constraints:
        // 1. Quantity constraint: total fill must not exceed maximum
        const fitsQuantity = (totalFill + BigInt(bid.amount)) <= BigInt(constraints.makerMaximumAmount);
        // 2. Price constraint: bid price must meet minimum per-token price
        const meetsPrice = BigInt(bid.price) >= BigInt(constraints.makerMinimumPrice);
        // Include bid only if BOTH constraints are satisfied
        if (fitsQuantity && meetsPrice) {
            winners.push(bid);
            totalFill += BigInt(bid.amount);
            totalValue += BigInt(bid.price) * BigInt(bid.amount);
            // Set bit for this winner's original position
            winnerBitmask |= (1 << bid.originalIndex);
        }
    }
    // Calculate weighted average price (avoid division by zero)
    const weightedAvgPrice = totalFill > 0n ? totalValue / totalFill : 0n;
    return {
        winners,
        totalFill,
        totalValue,
        weightedAvgPrice,
        numWinners: winners.length,
        winnerBitmask,
        winnerBits: generateWinnerBits(winnerBitmask)
    };
}
/**
 * Generate sorting arrays for ZK circuit input
 *
 * The circuit needs to verify that bids are sorted correctly.
 * This function generates the required permutation arrays.
 *
 * @param bids Array of N=8 bids (padded with nulls)
 * @returns Sorting arrays for circuit input
 */
function generateSortingArrays(bids) {
    const N = 8;
    // Ensure we have exactly N bids
    if (bids.length !== N) {
        throw new Error(`generateSortingArrays expects exactly ${N} bids, got ${bids.length}`);
    }
    // Create array of indices with their corresponding prices for sorting
    const indexedBids = bids.map((bid, index) => ({
        originalIndex: index,
        price: bid.price,
        amount: bid.amount
    }));
    // Sort by price descending, maintaining original indices
    indexedBids.sort((a, b) => {
        return a.price > b.price ? -1 : a.price < b.price ? 1 : 0;
    });
    // Extract sorted arrays
    const sortedPrices = indexedBids.map(item => item.price);
    const sortedAmounts = indexedBids.map(item => item.amount);
    const sortedIndices = indexedBids.map(item => item.originalIndex);
    return {
        sortedPrices,
        sortedAmounts,
        sortedIndices
    };
}
/**
 * Generate winner bits array for ZK circuit input
 *
 * The circuit needs individual winner bits (not a bitmask) for constraint validation.
 *
 * @param winnerBitmask Bitmask indicating winners (bit i = 1 if position i won)
 * @returns Array of 8 winner bits (0 or 1)
 */
function generateWinnerBits(winnerBitmask) {
    const N = 8;
    const winnerBits = [];
    for (let i = 0; i < N; i++) {
        winnerBits.push((winnerBitmask >> i) & 1);
    }
    return winnerBits;
}
/**
 * Utility function to format bigint as ETH for readable output
 */
function formatEther(value) {
    const eth = Number(value) / 1e18;
    return eth.toFixed(6);
}
module.exports = {
    simulateAuction,
    generateSortingArrays,
    generateWinnerBits,
    formatEther
};
