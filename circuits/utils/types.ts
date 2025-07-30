/**
 * TypeScript Types for zkFusion Circuit Utilities
 * 
 * Provides type safety and better IntelliSense for circuit testing and utilities.
 */

// BN254 Field Element - ensures values are within the correct range
type FieldElement = bigint;

// BN254 prime field constant
const BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Bid structure for auction simulation
 */
interface Bid {
  price: bigint;
  amount: bigint;
  bidderAddress: string;
  originalIndex: number;
}

/**
 * Auction constraints that define the rules
 */
interface AuctionConstraints {
  makerMinimumPrice: bigint;
  makerMaximumAmount: bigint;
  commitmentContractAddress: string;
}

/**
 * Result of auction simulation
 */
interface AuctionResult {
  winners: Bid[];
  totalFill: bigint;
  totalValue: bigint;
  weightedAvgPrice: bigint;
  numWinners: number;
  winnerBitmask: number;
  winnerBits: number[];
}

/**
 * Circuit input structure for N=8 circuit
 */
interface CircuitInputs {
  // Private inputs (revealed bids)
  bidPrices: string[];        // [8] - prices of bids
  bidAmounts: string[];       // [8] - amounts of bids
  bidderAddresses: string[];  // [8] - bidder addresses as field elements
  sortedPrices: string[];     // [8] - prices sorted in descending order
  sortedAmounts: string[];    // [8] - amounts corresponding to sorted prices
  sortedIndices: string[];    // [8] - original indices of sorted bids
  winnerBits: string[];       // [8] - binary array indicating winners
  
  // Public inputs (from commitment contract)
  commitments: string[];             // [8] - Poseidon hashes of bids
  commitmentContractAddress: string; // Contract address for replay protection
  makerMinimumPrice: string;         // Minimum acceptable price per token
  makerMaximumAmount: string;        // Maximum tokens to sell
}

/**
 * Circuit outputs structure
 */
interface CircuitOutputs {
  totalFill: bigint;          // Total amount of tokens filled
  weightedAvgPrice: bigint;   // Actually total value (contract calculates price)
  numWinners: bigint;         // Number of winning bids
  winnerBitmask: bigint;      // Bitmask representing winners
}

/**
 * Witness calculation result
 */
interface WitnessResult {
  witness: bigint[];
  publicSignals: bigint[];
}

/**
 * Hash function interface for consistency
 */
interface HashFunction {
  (inputs: bigint[]): Promise<bigint>;
}

/**
 * Mock hash function type for testing
 */
interface MockHashFunction {
  (inputs: bigint[]): bigint;
}

/**
 * Commitment generation function interface
 */
interface CommitmentGenerator {
  (bid: Bid, contractAddress: string): Promise<bigint> | bigint;
}

/**
 * Circuit testing utilities interface
 */
interface CircuitTester {
  calculateWitness(inputs: CircuitInputs): Promise<bigint[]>;
  expectConstraintPass(inputs: CircuitInputs): Promise<void>;
  expectConstraintFail(inputs: CircuitInputs): Promise<void>;
}

/**
 * Poseidon hash configuration
 */
interface PoseidonConfig {
  nInputs: number;
  nRoundsF: number;
  nRoundsP: number;
  seed: string;
  prime: bigint;
}

/**
 * Test case structure for systematic testing
 */
interface TestCase {
  name: string;
  description: string;
  inputs: CircuitInputs;
  expectedOutputs?: Partial<CircuitOutputs>;
  shouldPass: boolean;
  tags?: string[];
}

/**
 * Validation result for test cases
 */
interface ValidationResult {
  testName: string;
  passed: boolean;
  actualOutputs?: Partial<CircuitOutputs>;
  error?: string;
  executionTime?: number;
}

/**
 * Circuit compilation result
 */
interface CircuitCompilationResult {
  success: boolean;
  circuitPath: string;
  wasmPath: string;
  r1csPath: string;
  constraints: {
    total: number;
    nonLinear: number;
    linear: number;
  };
  signals: {
    public: number;
    private: number;
    outputs: number;
  };
}

/**
 * Trusted setup result
 */
interface TrustedSetupResult {
  success: boolean;
  zkeyPath: string;
  vkeyPath: string;
  ptauPath: string;
  circuitSize: number;
}

/**
 * Proof generation result
 */
interface ProofResult {
  success: boolean;
  proof: {
    pi_a: [string, string, string];
    pi_b: [[string, string], [string, string], [string, string]];
    pi_c: [string, string, string];
  };
  publicSignals: string[];
  verificationKey?: any;
}

/**
 * Utility functions type definitions
 */
interface CircuitUtils {
  // Hash functions
  mockPoseidonHash: MockHashFunction;
  realPoseidonHash: HashFunction;
  
  // Commitment generation
  generateCommitment: CommitmentGenerator;
  generateCommitmentReal: CommitmentGenerator;
  
  // Auction simulation
  simulateAuction: (bids: Bid[], constraints: AuctionConstraints) => AuctionResult;
  
  // Input generation
  generateCircuitInputs: (
    bids: Array<{price: string, amount: string, bidder: string}>,
    commitments: string[],
    makerMinimumPrice: bigint,
    makerMaximumAmount: bigint,
    contractAddress: string
  ) => Promise<CircuitInputs>;
  
  // Validation utilities
  validateFieldElement: (value: bigint) => boolean;
  validateCircuitInputs: (inputs: CircuitInputs) => ValidationResult[];
}

/**
 * Error types for better error handling
 */
class CircuitError extends Error {
  code: string;
  details?: any;
  
  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'CircuitError';
    this.code = code;
    this.details = details;
  }
}

class HashCompatibilityError extends CircuitError {
  constructor(message: string, details?: any) {
    super(message, 'HASH_COMPATIBILITY_ERROR', details);
  }
}

class FieldElementError extends CircuitError {
  constructor(message: string, details?: any) {
    super(message, 'FIELD_ELEMENT_ERROR', details);
  }
}

class WitnessGenerationError extends CircuitError {
  constructor(message: string, details?: any) {
    super(message, 'WITNESS_GENERATION', details);
    this.name = 'WitnessGenerationError';
  }
}

/**
 * Type guards for runtime type checking
 */
const isFieldElement = (value: any): value is FieldElement => {
  return typeof value === 'bigint' && value >= 0n && value < BN254_PRIME;
};

const isBid = (value: any): value is Bid => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.price === 'bigint' &&
    typeof value.amount === 'bigint' &&
    typeof value.bidderAddress === 'string' &&
    typeof value.originalIndex === 'number'
  );
};

const isCircuitInputs = (value: any): value is CircuitInputs => {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray(value.bidPrices) &&
    value.bidPrices.length === 8 &&
    Array.isArray(value.bidAmounts) &&
    value.bidAmounts.length === 8 &&
    Array.isArray(value.commitments) &&
    value.commitments.length === 8 &&
    typeof value.commitmentContractAddress === 'string' &&
    typeof value.makerMinimumPrice === 'string' &&
    typeof value.makerMaximumAmount === 'string'
  );
};

/**
 * Constants for circuit configuration
 */
const CIRCUIT_CONFIG = {
  N_MAX_BIDS: 8,
  POSEIDON_INPUTS: 4,
  BN254_PRIME,
  MAX_FIELD_BITS: 254,
  COMPARATOR_BITS: 128, // Updated from 64 to handle larger values
} as const;

/**
 * Test configuration
 */
const TEST_CONFIG = {
  DEFAULT_TIMEOUT: 60000,
  WITNESS_GENERATION_TIMEOUT: 30000,
  PROOF_GENERATION_TIMEOUT: 120000,
  MAX_RETRY_ATTEMPTS: 3,
} as const;

// CommonJS exports
module.exports = {
  CIRCUIT_CONFIG,
  BN254_PRIME,
  CircuitError,
  HashCompatibilityError,
  FieldElementError,
  TEST_CONFIG
}; 