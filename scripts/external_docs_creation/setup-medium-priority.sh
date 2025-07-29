#!/bin/bash
# File: scripts/setup-medium-priority.sh

set -e
cd docs_external

echo "📦 Setting up medium priority resources..."

# OpenZeppelin Contracts
if [ ! -d "ethereum/openzeppelin" ]; then
    echo "Cloning OpenZeppelin Contracts..."
        git clone --depth 1 git@github.com:OpenZeppelin/openzeppelin-contracts.git ethereum/openzeppelin
fi

# Hardhat examples
if [ ! -d "hardhat/examples" ]; then
    echo "Cloning Hardhat examples..."
        git clone --depth 1 git@github.com:NomicFoundation/hardhat.git hardhat/hardhat-repo
    cp -r hardhat/hardhat-repo/packages/hardhat-core/sample-projects hardhat/examples
    rm -rf hardhat/hardhat-repo
fi

# Ethers.js repository
if [ ! -d "ethereum/ethers/repo" ]; then
    echo "Cloning Ethers.js repository..."
        git clone --depth 1 git@github.com:ethers-io/ethers.js.git ethereum/ethers/repo
fi

echo "✅ Medium priority setup completed!" 