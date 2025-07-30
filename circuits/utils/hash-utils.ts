/**
 * Hash Utilities for zkFusion
 * 
 * Provides hash functions for commitment generation and verification.
 * Currently uses mock implementation - will be replaced with real Poseidon later.
 */

// import type { Bid } from './types';

/**
 * Mock Poseidon(4) hash calculation
 * 
 * For testing, we use a simple deterministic hash that combines all inputs.
 * In production, this will be replaced with actual Poseidon hash from circomlibjs.
 * 
 * @param price Bid price in wei
 * @param amount Bid amount in wei  
 * @param address Bidder Ethereum address
 * @param contractAddr Commitment contract address
 * @returns Mock hash value as bigint
 */
function mockPoseidonHash(
  price: bigint, 
  amount: bigint, 
  address: string, 
  contractAddr: string
): bigint {
  // Simple mock hash for testing - combines all inputs deterministically
  const combined = `${price}-${amount}-${address}-${contractAddr}`;
  let hash = 0n;
  
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 31n + BigInt(combined.charCodeAt(i))) % (2n ** 254n);
  }
  
  return hash;
}

/**
 * Generate commitment hash for a bid using 4-input Poseidon
 * 
 * This is the main commitment generation function used throughout the system.
 * 
 * @param bid Bid object containing price, amount, and bidder address
 * @param contractAddress Commitment contract address (for replay protection)
 * @returns Commitment hash as bigint
 */
function generateCommitment(bid: any, contractAddress: string): bigint {
  return mockPoseidonHash(bid.price, bid.amount, bid.bidderAddress, contractAddress);
}

/**
 * Generate commitment hashes for an array of bids
 * 
 * @param bids Array of bid objects
 * @param contractAddress Commitment contract address
 * @returns Array of commitment hashes
 */
function generateCommitments(bids: any[], contractAddress: string): bigint[] {
  return bids.map(bid => generateCommitment(bid, contractAddress));
}

/**
 * Real Poseidon hash implementation using poseidon-lite
 */
const { poseidon4 } = require('poseidon-lite');

function realPoseidonHash(inputs: bigint[]): bigint {
  // Use poseidon-lite which is compatible with our circuit
  const result = poseidon4(inputs);
  return BigInt(result);
}

/**
 * Generate commitment hash using real Poseidon(4) - FIXED TO MATCH CIRCUIT
 */
async function generateCommitmentReal(bid: any, contractAddress: string): Promise<bigint> {
  // FIXED: Use raw BigInt addresses (no conversion) to match circuit expectations
  const bidderBigInt = BigInt(bid.bidderAddress);
  const contractBigInt = BigInt(contractAddress);
  
  // Use the exact same input format as the circuit
  const inputs = [
    bid.price,           // price
    bid.amount,          // amount
    bidderBigInt,        // bidder address (raw BigInt)
    contractBigInt       // contract address (raw BigInt)
  ];
  return await realPoseidonHash(inputs);
} 

// CommonJS exports
module.exports = {
  mockPoseidonHash,
  generateCommitment,
  generateCommitments,
  realPoseidonHash,
  generateCommitmentReal
}; 