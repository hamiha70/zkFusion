/**
 * zkFusion Circuit Type Definitions
 * 
 * These types define the interface between our circuit and the TypeScript codebase.
 * They ensure type safety for circuit inputs, outputs, and related data structures.
 */

// ============================================================================
// CIRCUIT INPUT/OUTPUT TYPES
// ============================================================================

/**
 * Input signals for the zkDutchAuction circuit
 * Based on the circuit design in circuits/zkDutchAuction.circom
 */
export interface CircuitInputs {
  // Private inputs (hidden from public)
  bidPrices: bigint[];      // Original bid prices [600n, 1000n, 400n, 800n]
  bidAmounts: bigint[];     // Original bid amounts [10n, 20n, 15n, 30n]
  nonces: bigint[];         // Commitment nonces [123n, 456n, 789n, 12n]
  
  // Sorting verification inputs (computed off-chain)
  sortedPrices: bigint[];   // Bids sorted by price descending [1000n, 800n, 600n, 400n]
  sortedAmounts: bigint[];  // Corresponding amounts [20n, 30n, 10n, 15n]
  sortedIndices: bigint[];  // Permutation mapping [1n, 3n, 0n, 2n]
  
  // Public inputs (visible to all)
  commitments: bigint[];           // On-chain Poseidon hashes
  makerAsk: bigint;               // Maximum amount maker wants to fill
  commitmentContractAddress: bigint; // Binds proof to specific auction
  
  // Index signature for Circomkit compatibility
  [key: string]: bigint | bigint[];
}

/**
 * Output signals from the zkDutchAuction circuit
 */
export interface CircuitOutputs {
  totalFill: bigint;        // Total amount filled in the auction
  weightedAvgPrice: bigint; // Actually totalValue (contract calculates price = totalValue / totalFill)
  numWinners: bigint;       // Number of winning bidders
}

/**
 * Complete circuit witness (for testing and debugging)
 */
export interface CircuitWitness {
  [signalName: string]: bigint;
}

// ============================================================================
// AUCTION DATA TYPES
// ============================================================================

/**
 * A single bid in the auction
 */
export interface Bid {
  bidder: string;           // Bidder's Ethereum address
  price: bigint;           // Price per unit (in wei or token units)
  amount: bigint;          // Amount they want to buy
  nonce: bigint;           // Random nonce for commitment
  commitment?: bigint;     // Poseidon hash commitment (computed)
}

/**
 * Auction configuration and state
 */
export interface AuctionConfig {
  makerAsk: bigint;                    // Maximum amount maker wants to fill
  commitmentContractAddress: string;   // Address of the commitment contract
  bidders: Bid[];                     // All submitted bids
  revealDeadline: number;             // Timestamp for reveal deadline
  executionDeadline: number;          // Timestamp for execution deadline
}

/**
 * Auction results after off-chain computation
 */
export interface AuctionResult {
  winners: string[];        // Array of winning bidder addresses
  totalFill: bigint;       // Total amount filled
  weightedAvgPrice: bigint; // Weighted average price (totalValue)
  sortedBids: Bid[];       // Bids sorted by price (descending)
  permutation: bigint[];   // Mapping from sorted position to original position
}

// ============================================================================
// ZK PROOF TYPES
// ============================================================================

/**
 * Generated ZK proof structure (Groth16)
 */
export interface ZKProof {
  pi_a: [string, string];
  pi_b: [[string, string], [string, string]];
  pi_c: [string, string];
  protocol: string;
  curve: string;
}

/**
 * Public signals for proof verification
 */
export interface PublicSignals {
  totalFill: string;        // As string for JSON serialization
  weightedAvgPrice: string; // As string for JSON serialization
  numWinners: string;       // As string for JSON serialization
  // Note: Other public inputs (commitments, makerAsk, etc.) are also included
}

/**
 * Complete proof package for contract submission
 */
export interface ProofPackage {
  proof: ZKProof;
  publicSignals: PublicSignals;
  winners: string[];        // Derived from permutation
  circuitInputs: CircuitInputs; // For debugging/verification
}

// ============================================================================
// FIELD ELEMENT UTILITIES
// ============================================================================

/**
 * Field element constraints for BN254 curve
 */
export const FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Helper type for values that must be valid field elements
 */
export type FieldElement = bigint;

/**
 * Validation result for field elements
 */
export interface FieldValidationResult {
  isValid: boolean;
  value?: FieldElement;
  error?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Circuit-specific error types
 */
export enum CircuitErrorType {
  INVALID_INPUT = 'INVALID_INPUT',
  FIELD_OVERFLOW = 'FIELD_OVERFLOW',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  WITNESS_GENERATION_FAILED = 'WITNESS_GENERATION_FAILED',
  PROOF_GENERATION_FAILED = 'PROOF_GENERATION_FAILED',
  PROOF_VERIFICATION_FAILED = 'PROOF_VERIFICATION_FAILED'
}

/**
 * Circuit error with context
 */
export interface CircuitError extends Error {
  type: CircuitErrorType;
  context?: Record<string, any>;
  circuitInputs?: Partial<CircuitInputs>;
}

// ============================================================================
// TESTING TYPES
// ============================================================================

/**
 * Test case for circuit validation
 */
export interface CircuitTestCase {
  name: string;
  description: string;
  inputs: CircuitInputs;
  expectedOutputs?: Partial<CircuitOutputs>;
  shouldPass: boolean;
  category: 'basic' | 'sorting' | 'attack' | 'edge-case' | 'performance';
}

/**
 * Performance benchmark results
 */
export interface BenchmarkResult {
  testName: string;
  witnessGenerationTime: number;  // milliseconds
  proofGenerationTime?: number;   // milliseconds
  verificationTime?: number;      // milliseconds
  constraintCount: number;
  memoryUsage?: number;          // bytes
}

// ============================================================================
// UTILITY FUNCTIONS TYPE SIGNATURES
// ============================================================================

/**
 * Function type for generating circuit inputs from auction data
 */
export type CircuitInputGenerator = (
  auction: AuctionConfig,
  result: AuctionResult
) => Promise<CircuitInputs>;

/**
 * Function type for validating circuit inputs
 */
export type CircuitInputValidator = (
  inputs: CircuitInputs
) => Promise<FieldValidationResult[]>;

/**
 * Function type for generating ZK proof
 */
export type ProofGenerator = (
  inputs: CircuitInputs
) => Promise<ProofPackage>;

/**
 * Function type for verifying ZK proof
 */
export type ProofVerifier = (
  proof: ZKProof,
  publicSignals: PublicSignals
) => Promise<boolean>;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Circuit configuration constants
 */
export const CIRCUIT_CONFIG = {
  MAX_BIDDERS: 4,           // N=4 for hackathon demo
  CONSTRAINT_COUNT: 1804,   // Expected constraint count
  PROVING_KEY_SIZE: 'TBD',  // Will be determined after setup
  VERIFICATION_KEY_SIZE: 'TBD'
} as const;

/**
 * Poseidon hash configuration
 */
export const POSEIDON_CONFIG = {
  INPUTS: 3,                // [price, amount, nonce]
  ROUNDS_FULL: 8,
  ROUNDS_PARTIAL: 57
} as const; 