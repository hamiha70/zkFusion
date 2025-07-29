/**
 * Hash Utilities for zkFusion
 * 
 * Provides hash functions for commitment generation and verification.
 * Currently uses mock implementation - will be replaced with real Poseidon later.
 */

import type { Bid } from './auction-simulator';

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
export function mockPoseidonHash(
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
export function generateCommitment(bid: Bid, contractAddress: string): bigint {
  return mockPoseidonHash(bid.price, bid.amount, bid.bidderAddress, contractAddress);
}

/**
 * Generate commitment hashes for an array of bids
 * 
 * @param bids Array of bid objects
 * @param contractAddress Commitment contract address
 * @returns Array of commitment hashes
 */
export function generateCommitments(bids: Bid[], contractAddress: string): bigint[] {
  return bids.map(bid => generateCommitment(bid, contractAddress));
}

/**
 * Real Poseidon hash implementation using circomlibjs
 */
// @ts-ignore - circomlibjs doesn't have TypeScript declarations
import { buildPoseidon } from 'circomlibjs';

let poseidonInstance: any = null;

async function getPoseidon() {
  if (!poseidonInstance) {
    poseidonInstance = await buildPoseidon();
  }
  return poseidonInstance;
}

export async function realPoseidonHash(inputs: bigint[]): Promise<bigint> {
  const poseidon = await getPoseidon();
  const result = poseidon(inputs);
  
  // CRITICAL: circomlibjs Poseidon returns the field element in a specific format
  // Based on research: we need to extract the single field element properly
  if (typeof result === 'bigint') {
    return result;
  } else if (Array.isArray(result)) {
    // Result is an array - convert to single field element using big-endian interpretation
    let value = 0n;
    for (let i = 0; i < result.length; i++) {
      value = (value * 256n) + BigInt(result[i]);
    }
    return value;
  } else if (result && result.toString) {
    const str = result.toString();
    if (str.includes(',')) {
      // Parse comma-separated field element representation
      // This is the internal representation - convert to single BigInt
      const bytes = str.split(',').map((s: string) => parseInt(s.trim()));
      let value = 0n;
      for (let i = 0; i < bytes.length; i++) {
        value = (value * 256n) + BigInt(bytes[i]);
      }
      return value;
    }
    return BigInt(str);
  } else {
    throw new Error(`Unexpected Poseidon result format: ${typeof result}, value: ${result}`);
  }
}

/**
 * Generate commitment hash using real Poseidon(4)
 */
export async function generateCommitmentReal(bid: Bid, contractAddress: string): Promise<bigint> {
  // Use the same address conversion as the circuit
  const contractBigInt = BigInt('0x' + contractAddress.replace('0x', ''));
  const inputs = [
    bid.price,
    bid.amount,
    contractBigInt, // Convert address to bigint
    contractBigInt  // Contract address for uniqueness
  ];
  return await realPoseidonHash(inputs);
} 