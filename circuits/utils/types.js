/**
 * Types and Constants for zkFusion (JavaScript version)
 * 
 * Essential constants and type checking functions for circuit utilities.
 */

// BN254 curve prime (field modulus)
const BN254_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

// Circuit configuration
const CIRCUIT_CONFIG = {
    N: 8,  // Maximum number of bids
    FIELD_BITS: 254,
    MAX_SAFE_INTEGER: 2n ** 252n  // Safe range for field elements
};

/**
 * Check if a value is a valid field element
 */
function isFieldElement(value) {
    if (typeof value === 'bigint') {
        return value >= 0n && value < BN254_PRIME;
    }
    if (typeof value === 'number') {
        return Number.isInteger(value) && value >= 0 && BigInt(value) < BN254_PRIME;
    }
    if (typeof value === 'string') {
        try {
            const bigintValue = BigInt(value);
            return bigintValue >= 0n && bigintValue < BN254_PRIME;
        } catch {
            return false;
        }
    }
    return false;
}

/**
 * Custom error for field element validation
 */
class FieldElementError extends Error {
    constructor(message) {
        super(message);
        this.name = 'FieldElementError';
    }
}

/**
 * Convert value to BigInt field element
 */
function toFieldElement(value) {
    let bigintValue;
    
    if (typeof value === 'bigint') {
        bigintValue = value;
    } else if (typeof value === 'number') {
        if (!Number.isInteger(value)) {
            throw new FieldElementError(`Value must be an integer: ${value}`);
        }
        bigintValue = BigInt(value);
    } else if (typeof value === 'string') {
        try {
            bigintValue = BigInt(value);
        } catch {
            throw new FieldElementError(`Invalid string for BigInt conversion: ${value}`);
        }
    } else {
        throw new FieldElementError(`Unsupported type for field element: ${typeof value}`);
    }
    
    if (bigintValue < 0n) {
        throw new FieldElementError(`Field element cannot be negative: ${bigintValue}`);
    }
    
    if (bigintValue >= BN254_PRIME) {
        throw new FieldElementError(`Field element too large: ${bigintValue} >= ${BN254_PRIME}`);
    }
    
    return bigintValue;
}

// CommonJS exports
module.exports = {
    BN254_PRIME,
    CIRCUIT_CONFIG,
    isFieldElement,
    FieldElementError,
    toFieldElement
}; 