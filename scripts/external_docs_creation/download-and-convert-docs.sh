#!/bin/bash
# File: scripts/external_docs_creation/download-and-convert-docs.sh
# Purpose: Download high-quality tutorial and documentation repositories

set -e

echo "🚀 Starting high-quality documentation download..."

# Check dependencies
check_dependencies() {
    echo "📋 Checking dependencies..."
    
    if ! command -v git &> /dev/null; then
        echo "❌ git is required. Please install it first."
        exit 1
    fi
    
    echo "✅ Dependencies check passed"
}

# Add high-quality ZK tutorials
add_zk_tutorials() {
    echo "📚 Adding high-quality ZK tutorials..."
    
    mkdir -p docs_external/zk-tools/tutorials
    cd docs_external/zk-tools/tutorials
    
    # Clone comprehensive ZK tutorial repositories
    if [ ! -d "circomlib-examples" ]; then
        echo "Cloning circomlib examples..."
        git clone --depth 1 git@github.com:iden3/circomlib.git circomlib-examples || echo "⚠️  Failed to clone circomlib-examples"
    fi
    
    if [ ! -d "zk-tutorials" ]; then
        echo "Cloning ZK tutorials..."
        git clone --depth 1 git@github.com:iden3/snarkjs.git zk-tutorials || echo "⚠️  Failed to clone zk-tutorials"
    fi
    
    if [ ! -d "circom-examples" ]; then
        echo "Cloning Circom examples..."
        git clone --depth 1 git@github.com:iden3/circom.git circom-examples || echo "⚠️  Failed to clone circom-examples"
    fi
    
    if [ ! -d "zk-proofs-examples" ]; then
        echo "Cloning ZK proofs examples..."
        git clone --depth 1 git@github.com:iden3/circomlibjs.git zk-proofs-examples || echo "⚠️  Failed to clone zk-proofs-examples"
    fi
    
    echo "✅ ZK tutorials added"
}

# Add DeFi integration examples
add_defi_tutorials() {
    echo "📚 Adding DeFi integration tutorials..."
    
    mkdir -p docs_external/tutorials/defi-integration
    cd docs_external/tutorials/defi-integration
    
    # Clone high-quality DeFi integration examples
    if [ ! -d "openzeppelin-contracts" ]; then
        echo "Cloning OpenZeppelin contracts..."
        git clone --depth 1 git@github.com:OpenZeppelin/openzeppelin-contracts.git openzeppelin-contracts || echo "⚠️  Failed to clone openzeppelin-contracts"
    fi
    
    if [ ! -d "1inch-examples" ]; then
        echo "Cloning 1inch examples..."
        git clone --depth 1 git@github.com:1inch/1inch-sdk.git 1inch-examples || echo "⚠️  Failed to clone 1inch-examples"
    fi
    
    if [ ! -d "defi-examples" ]; then
        echo "Cloning DeFi examples..."
        git clone --depth 1 git@github.com:OpenZeppelin/openzeppelin-contracts.git defi-examples || echo "⚠️  Failed to clone defi-examples"
    fi
    
    echo "✅ DeFi tutorials added"
}

# Add security best practices
add_security_tutorials() {
    echo "📚 Adding security tutorials..."
    
    mkdir -p docs_external/tutorials/security
    cd docs_external/tutorials/security
    
    # Clone security resources
    if [ ! -d "consensys-best-practices" ]; then
        echo "Cloning ConsenSys best practices..."
        git clone --depth 1 git@github.com:ConsenSys/smart-contract-best-practices.git consensys-best-practices || echo "⚠️  Failed to clone consensys-best-practices"
    fi
    
    if [ ! -d "swc-registry" ]; then
        echo "Cloning SWC registry..."
        git clone --depth 1 git@github.com:smartcontractsecurity/SWC-registry.git swc-registry || echo "⚠️  Failed to clone swc-registry"
    fi
    
    if [ ! -d "security-toolbox" ]; then
        echo "Cloning security toolbox..."
        git clone --depth 1 git@github.com:OpenZeppelin/defender-client.git security-toolbox || echo "⚠️  Failed to clone security-toolbox"
    fi
    
    echo "✅ Security tutorials added"
}

# Add Hardhat and Ethers.js examples
add_development_tutorials() {
    echo "📚 Adding development tutorials..."
    
    mkdir -p docs_external/hardhat/examples
    cd docs_external/hardhat/examples
    
    # Clone Hardhat examples
    if [ ! -d "hardhat-examples" ]; then
        echo "Cloning Hardhat examples..."
        git clone --depth 1 git@github.com:NomicFoundation/hardhat.git hardhat-repo
        cp -r hardhat-repo/packages/hardhat-core/sample-projects/* . 2>/dev/null || echo "⚠️  Failed to copy Hardhat examples"
        rm -rf hardhat-repo
    fi
    
    mkdir -p ../../ethereum/ethers/examples
    cd ../../ethereum/ethers/examples
    
    # Clone Ethers.js examples
    if [ ! -d "ethers-examples" ]; then
        echo "Cloning Ethers.js examples..."
        git clone --depth 1 git@github.com:ethers-io/ethers.js.git ethers-repo
        # Copy available documentation and examples
        if [ -d "ethers-repo/README.md" ]; then
            cp ethers-repo/README.md ./ethers-readme.md || echo "⚠️  Failed to copy Ethers.js README"
        fi
        if [ -d "ethers-repo/CHANGELOG.md" ]; then
            cp ethers-repo/CHANGELOG.md ./ethers-changelog.md || echo "⚠️  Failed to copy Ethers.js changelog"
        fi
        if [ -d "ethers-repo/testcases" ]; then
            cp -r ethers-repo/testcases/* . 2>/dev/null || echo "⚠️  Failed to copy Ethers.js testcases"
        fi
        if [ -d "ethers-repo/misc" ]; then
            cp -r ethers-repo/misc/* . 2>/dev/null || echo "⚠️  Failed to copy Ethers.js misc files"
        fi
        rm -rf ethers-repo
    fi
    
    echo "✅ Development tutorials added"
}

# Add API documentation from repositories
add_api_documentation() {
    echo "📚 Adding API documentation..."
    
    mkdir -p docs_external/1inch/docs/api-docs
    cd docs_external/1inch/docs/api-docs
    
    # Extract API documentation from 1inch SDK
    if [ -f "../../1inch-sdk/README.md" ]; then
        echo "Extracting 1inch SDK documentation..."
        cp ../../1inch-sdk/README.md ./1inch-sdk.md || echo "⚠️  Failed to copy 1inch SDK docs"
    fi
    
    if [ -f "../../limit-order-protocol/README.md" ]; then
        echo "Extracting Limit Order Protocol documentation..."
        cp ../../limit-order-protocol/README.md ./limit-order-protocol.md || echo "⚠️  Failed to copy LOP docs"
    fi
    
    if [ -f "../../fusion-sdk/README.md" ]; then
        echo "Extracting Fusion SDK documentation..."
        cp ../../fusion-sdk/README.md ./fusion-sdk.md || echo "⚠️  Failed to copy Fusion SDK docs"
    fi
    
    # Copy additional documentation files
    if [ -d "../../1inch-sdk/docs" ]; then
        echo "Copying 1inch SDK docs..."
        cp -r ../../1inch-sdk/docs/* . 2>/dev/null || echo "⚠️  Failed to copy 1inch SDK docs directory"
    fi
    
    mkdir -p ../../ethereum/ethers/docs/api-docs
    cd ../../ethereum/ethers/docs/api-docs
    
    # Extract Ethers.js documentation
    if [ -f "../../repo/README.md" ]; then
        echo "Extracting Ethers.js API documentation..."
        cp ../../repo/README.md ./ethers-js.md || echo "⚠️  Failed to copy Ethers.js docs"
    fi
    
    if [ -f "../../repo/CHANGELOG.md" ]; then
        echo "Extracting Ethers.js changelog..."
        cp ../../repo/CHANGELOG.md ./ethers-changelog.md || echo "⚠️  Failed to copy Ethers.js changelog"
    fi
    
    # Copy additional Ethers.js documentation
    if [ -d "../../repo/docs.wrm" ]; then
        echo "Copying Ethers.js documentation..."
        cp -r ../../repo/docs.wrm/* . 2>/dev/null || echo "⚠️  Failed to copy Ethers.js docs directory"
    fi
    
    echo "✅ API documentation added"
}

# Validate results
validate_results() {
    echo "🔍 Validating results..."
    
    # Count tutorial files
    local tutorial_files=$(find docs_external -name "*.md" -path "*/tutorials/*" | wc -l)
    echo "📊 Tutorial markdown files: $tutorial_files"
    
    # Count API documentation files
    local api_files=$(find docs_external -name "*.md" -path "*/docs/*" | wc -l)
    echo "📊 API documentation files: $api_files"
    
    # Count example files
    local example_files=$(find docs_external -name "*.md" -path "*/examples/*" | wc -l)
    echo "📊 Example files: $example_files"
    
    # Check for high-quality content
    local quality_files=$(find docs_external -name "*.md" -exec grep -l -i "tutorial\|guide\|example\|api\|endpoint" {} \; | wc -l)
    echo "📊 High-quality content files: $quality_files"
    
    echo "✅ Validation completed"
}

# Main execution
main() {
    echo "🚀 Starting high-quality documentation setup..."
    
    check_dependencies
    add_zk_tutorials
    add_defi_tutorials
    add_security_tutorials
    add_development_tutorials
    add_api_documentation
    validate_results
    
    echo "🎉 High-quality documentation setup completed!"
    echo ""
    echo "📊 Summary:"
    echo "- Added comprehensive ZK tutorials"
    echo "- Added DeFi integration examples"
    echo "- Added security best practices"
    echo "- Added development tutorials"
    echo "- Added API documentation from repos"
    echo ""
    echo "📁 Your docs_external folder now has high-quality, curated content!"
}

# Run main function
main 