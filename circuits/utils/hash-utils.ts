/**
 * Hash Utilities for zkFusion
 * 
 * Provides hash functions for commitment generation and verification.
 * Currently uses mock implementation - will be replaced with real Poseidon later.
 */

import type { Bid } from './types';

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
  
  // CRITICAL: circomlibjs Poseidon returns a field element in various formats
  // We need to extract it correctly and ensure it's within BN254 field bounds
  const BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
  
  let fieldElement: bigint;
  
  if (typeof result === 'bigint') {
    fieldElement = result;
  } else if (result && typeof result === 'object' && result.toString) {
    // circomlibjs often returns a field element object
    const str = result.toString();
    if (str.includes(',')) {
      // This IS the expected format - comma-separated bytes representing the field element
      // Convert the comma-separated bytes to a single BigInt
      const bytes = str.split(',').map((s: string) => parseInt(s.trim()));
      fieldElement = 0n;
      for (let i = 0; i < bytes.length; i++) {
        fieldElement = (fieldElement * 256n) + BigInt(bytes[i]);
      }
    } else {
      fieldElement = BigInt(str);
    }
  } else if (Array.isArray(result)) {
    // Handle array format directly
    fieldElement = 0n;
    for (let i = 0; i < result.length; i++) {
      fieldElement = (fieldElement * 256n) + BigInt(result[i]);
    }
  } else {
    throw new Error(`Unexpected Poseidon result format: ${typeof result}, value: ${result}`);
  }
  
  // Ensure the result is within the BN254 field bounds
  if (fieldElement >= BN254_PRIME) {
    fieldElement = fieldElement % BN254_PRIME;
  }
  
  // Ensure it's positive
  if (fieldElement < 0n) {
    fieldElement = fieldElement + BN254_PRIME;
  }
  
  return fieldElement;
}

/**
 * Generate commitment hash using real Poseidon(4) - FIXED TO MATCH CIRCUIT
 */
export async function generateCommitmentReal(bid: Bid, contractAddress: string): Promise<bigint> {
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