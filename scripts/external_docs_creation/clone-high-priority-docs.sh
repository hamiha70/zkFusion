#!/bin/bash
# File: scripts/clone-high-priority-docs.sh

set -e
cd docs_external

echo "📦 Cloning high priority repositories..."

# 1inch Limit Order Protocol
if [ ! -d "1inch/limit-order-protocol" ]; then
    echo "Cloning 1inch Limit Order Protocol..."
        git clone --depth 1 git@github.com:1inch/limit-order-protocol.git 1inch/limit-order-protocol
fi

# 1inch Fusion SDK
if [ ! -d "1inch/fusion-sdk" ]; then
    echo "Cloning 1inch Fusion SDK..."
        git clone --depth 1 git@github.com:1inch/fusion-sdk.git 1inch/fusion-sdk
fi

# 1inch SDK
if [ ! -d "1inch/1inch-sdk" ]; then
    echo "Cloning 1inch SDK..."
        git clone --depth 1 git@github.com:1inch/1inch-sdk.git 1inch/1inch-sdk
fi

# Circom
if [ ! -d "zk-tools/circom" ]; then
    echo "Cloning Circom..."
        git clone --depth 1 git@github.com:iden3/circom.git zk-tools/circom
fi

# SnarkJS
if [ ! -d "zk-tools/snarkjs" ]; then
    echo "Cloning SnarkJS..."
        git clone --depth 1 git@github.com:iden3/snarkjs.git zk-tools/snarkjs
fi

# CircomlibJS
if [ ! -d "zk-tools/circomlibjs" ]; then
    echo "Cloning CircomlibJS..."
        git clone --depth 1 git@github.com:iden3/circomlibjs.git zk-tools/circomlibjs
fi

# Circomlib (circuit examples)
if [ ! -d "zk-tools/circomlib" ]; then
    echo "Cloning Circomlib..."
        git clone --depth 1 git@github.com:iden3/circomlib.git zk-tools/circomlib
fi

echo "✅ High priority repositories cloned successfully!" 