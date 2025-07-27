const { buildPoseidon } = require("circomlibjs");

let poseidonInstance = null;

/**
 * Initialize Poseidon hash function
 * This needs to be called before using poseidonHash
 */
async function initPoseidon() {
  if (!poseidonInstance) {
    poseidonInstance = await buildPoseidon();
  }
  return poseidonInstance;
}

/**
 * Compute Poseidon hash of inputs
 * @param {Array} inputs - Array of field elements to hash
 * @returns {BigInt} - Hash result as BigInt
 */
async function poseidonHash(inputs) {
  const poseidon = await initPoseidon();
  return poseidon.F.toString(poseidon(inputs));
}

/**
 * Hash a bid (price, amount, nonce) using Poseidon
 * @param {BigInt|string|number} price - Bid price
 * @param {BigInt|string|number} amount - Bid amount  
 * @param {BigInt|string|number} nonce - Random nonce
 * @returns {string} - Hash as string
 */
async function hashBid(price, amount, nonce) {
  const inputs = [
    BigInt(price.toString()),
    BigInt(amount.toString()),
    BigInt(nonce.toString())
  ];
  return await poseidonHash(inputs);
}

/**
 * Generate a random nonce for bid commitment
 * @returns {BigInt} - Random nonce
 */
function generateNonce() {
  // Generate a random number that fits in the field
  // Use 31 bytes instead of 32 to ensure it's always < field size
  const randomBytes = require('crypto').randomBytes(31);
  const nonce = BigInt('0x' + randomBytes.toString('hex'));
  
  // Double-check it fits in field (should always be true with 31 bytes)
  const fieldSize = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
  if (nonce >= fieldSize) {
    // Fallback: modulo operation (should never be needed with 31 bytes)
    return nonce % fieldSize;
  }
  
  return nonce;
}

/**
 * Format field element for circuit input
 * @param {BigInt|string|number} value - Value to format
 * @returns {string} - Formatted value as string
 */
function formatFieldElement(value) {
  return BigInt(value.toString()).toString();
}

/**
 * Validate that a value fits in the field
 * @param {BigInt|string|number} value - Value to validate
 * @returns {boolean} - True if valid field element
 */
function isValidFieldElement(value) {
  const fieldSize = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
  const val = BigInt(value.toString());
  return val >= 0n && val < fieldSize;
}

/**
 * Convert Ethereum address to field element safely
 * @param {string} address - Ethereum address (0x...)
 * @returns {string} - Field element as string
 */
function addressToFieldElement(address) {
  // Remove 0x prefix if present
  const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
  
  // Convert to BigInt
  const addressBigInt = BigInt('0x' + cleanAddress);
  
  // Ethereum addresses are 160-bit, which should fit in the field
  // But some edge cases might overflow, so we hash if needed
  if (isValidFieldElement(addressBigInt)) {
    return addressBigInt.toString();
  } else {
    // If address somehow overflows, hash it to fit in field
    // This is a fallback that should rarely be needed
    const fieldSize = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
    return (addressBigInt % fieldSize).toString();
  }
}

module.exports = {
  initPoseidon,
  poseidonHash,
  hashBid,
  generateNonce,
  formatFieldElement,
  isValidFieldElement,
  addressToFieldElement
}; 