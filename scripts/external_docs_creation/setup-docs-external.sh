#!/bin/bash
# File: scripts/setup-docs-external.sh

set -e  # Exit on any error

echo "🚀 Setting up docs_external directory structure..."

# Create base directory structure
mkdir -p docs_external/{hardhat,1inch,zk-tools,ethereum,tutorials}
mkdir -p docs_external/hardhat/{docs,examples}
mkdir -p docs_external/1inch/{limit-order-protocol,fusion-sdk,docs,examples}
mkdir -p docs_external/zk-tools/{circom,snarkjs,circomlibjs,tutorials}
mkdir -p docs_external/ethereum/{ethers,solidity,openzeppelin}
mkdir -p docs_external/tutorials/{zk-proofs,defi-integration,security}

# Add to .gitignore if not already present
if ! grep -q "docs_external/" .gitignore 2>/dev/null; then
    echo "docs_external/" >> .gitignore
    echo "✅ Added docs_external/ to .gitignore"
fi

echo "📁 Directory structure created successfully!" 