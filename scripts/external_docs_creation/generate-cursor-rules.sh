#!/bin/bash
# File: scripts/external_docs_creation/generate-cursor-rules.sh

mkdir -p .cursor

# Hardhat rules
cat > .cursor/hardhat.cursor-rules << 'EOF'
# Hardhat Development Rules
- Use async/await for all contract interactions
- Always use ethers.js v6 syntax
- Include gas estimation in deployment scripts
- Use Hardhat Network for local testing
- Configure via hardhat.config.js, not hardhat.config.ts
- Use describe/it for test structure
- Always check transaction receipts
- Reference docs_external/hardhat/examples/ for patterns
- Use OpenZeppelin contracts for security patterns
EOF

# 1inch Integration rules
cat > .cursor/1inch-integration.cursor-rules << 'EOF'
# 1inch Protocol Integration Rules
- Use @1inch/limit-order-protocol-utils for order creation
- Always validate order signatures before submission
- Handle partial fills in limit orders
- Use proper nonce management for orders
- Include maker/taker asset addresses validation
- Test with mock LOP contracts first
- Reference docs_external/1inch/limit-order-protocol/contracts/ for interfaces
- Use docs_external/1inch/fusion-sdk/ for advanced features
- Check docs_external/tutorials/defi-integration/ for examples
EOF

# ZK Circuit rules
cat > .cursor/zk-circuits.cursor-rules << 'EOF'
# Circom and ZK Proof Rules
- Use circomlibjs for Poseidon hashing
- Always validate circuit inputs are within field bounds
- Use proper witness generation before proof creation
- Include verification key validation
- Handle trusted setup files securely
- Use snarkjs.groth16 for proof generation
- Reference docs_external/zk-tools/circomlib/circuits/ for templates
- Check docs_external/zk-tools/tutorials/ for step-by-step guides
- Use docs_external/zk-tools/circomlibjs/ for JavaScript utilities
EOF

# Solidity Security rules
cat > .cursor/solidity-security.cursor-rules << 'EOF'
# Solidity Security Best Practices
- Use OpenZeppelin contracts for standard patterns
- Always check for reentrancy vulnerabilities
- Validate all external inputs
- Use SafeMath or Solidity 0.8+ overflow protection
- Implement proper access control
- Test with multiple accounts and edge cases
- Reference docs_external/ethereum/openzeppelin/contracts/ for patterns
- Check docs_external/tutorials/security/ for best practices
- Use docs_external/tutorials/security/consensys-best-practices/ for guidelines
EOF

# Testing patterns
cat > .cursor/testing-patterns.cursor-rules << 'EOF'
# Testing Best Practices
- Use describe blocks for test organization
- Test both success and failure cases
- Mock external dependencies
- Use beforeEach for setup
- Test gas usage for critical functions
- Verify events are emitted correctly
- Reference docs_external/hardhat/examples/ for patterns
- Use docs_external/tutorials/ for comprehensive examples
EOF

# DeFi Integration rules
cat > .cursor/defi-integration.cursor-rules << 'EOF'
# DeFi Integration Patterns
- Always validate token addresses and amounts
- Handle decimal precision correctly
- Implement proper slippage protection
- Use established protocols (Uniswap, 1inch) for swaps
- Test with multiple token types (ERC20, ERC721)
- Reference docs_external/tutorials/defi-integration/ for examples
- Check docs_external/1inch/ for protocol integration
- Use docs_external/ethereum/openzeppelin/ for token standards
EOF

# Ethers.js rules
cat > .cursor/ethers.cursor-rules << 'EOF'
# Ethers.js v6 Integration Rules
- Use ethers.js v6 syntax consistently
- Handle BigNumber conversions properly
- Use proper error handling for transactions
- Implement retry logic for failed transactions
- Use providers and signers correctly
- Reference docs_external/ethereum/ethers/repo/ for examples
- Check docs_external/ethereum/ethers/examples/ for patterns
- Use proper gas estimation and management
EOF

# API Documentation rules
cat > .cursor/api-documentation.cursor-rules << 'EOF'
# API Documentation Standards
- Always include parameter validation
- Document return types and error conditions
- Provide usage examples for each endpoint
- Include authentication requirements
- Reference docs_external/1inch/docs/api-docs/ for 1inch APIs
- Check docs_external/ethereum/ethers/docs/api-docs/ for Ethers.js APIs
- Use consistent formatting and structure
EOF

echo "✅ Cursor rules generated in .cursor/ directory"
echo "📁 Created rules for:"
echo "  - Hardhat development"
echo "  - 1inch integration"
echo "  - ZK circuits"
echo "  - Solidity security"
echo "  - Testing patterns"
echo "  - DeFi integration"
echo "  - Ethers.js v6"
echo "  - API documentation" 