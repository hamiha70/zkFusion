#!/bin/bash
# File: scripts/download-docs.sh

set -e
cd docs_external

echo "📥 Downloading documentation sites..."

# Check if wget is available
if ! command -v wget &> /dev/null; then
    echo "❌ wget is required for downloading docs. Please install it first."
    exit 1
fi

# Download 1inch documentation
if [ ! -d "1inch/docs" ]; then
    echo "Downloading 1inch API documentation..."
    mkdir -p 1inch/docs
    # Note: Replace with actual downloadable docs if available
    curl -s "https://docs.1inch.io/docs/limit-order-protocol/api" > 1inch/docs/limit-order-api.html || echo "⚠️  Manual download needed for 1inch docs"
fi

# Download Hardhat documentation (selective pages)
if [ ! -d "hardhat/docs" ]; then
    echo "Creating Hardhat docs placeholder..."
    mkdir -p hardhat/docs
    echo "# Hardhat Documentation" > hardhat/docs/README.md
    echo "Visit: https://hardhat.org/docs/" >> hardhat/docs/README.md
fi

# Download Ethers.js documentation
if [ ! -d "ethereum/ethers/docs" ]; then
    echo "Creating Ethers.js docs placeholder..."
    mkdir -p ethereum/ethers/docs
    echo "# Ethers.js Documentation" > ethereum/ethers/docs/README.md
    echo "Visit: https://docs.ethers.org/v6/" >> ethereum/ethers/docs/README.md
fi

echo "✅ Documentation download completed!" 