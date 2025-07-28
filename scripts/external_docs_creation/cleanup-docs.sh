#!/bin/bash
# File: scripts/external_docs_creation/cleanup-docs.sh
# Purpose: Clean up empty directories and small files

set -e

echo "🧹 Starting documentation cleanup..."

# Function to clean up small files
cleanup_small_files() {
    echo "📄 Cleaning up small files..."
    
    # Remove changeset files (just metadata)
    find docs_external -name "*.md" -path "*/.changeset/*" -size -100c -delete
    echo "  - Removed changeset files"
    
    # Remove TODO files (placeholders)
    find docs_external -name "TODO.md" -delete
    echo "  - Removed TODO files"
    
    # Remove bad message files
    find docs_external -name "badmsges.md" -delete
    echo "  - Removed bad message files"
    
    # Remove empty README files
    find docs_external -name "README.md" -size -50c -delete
    echo "  - Removed empty README files"
}

# Function to clean up empty directories (except git metadata)
cleanup_empty_dirs() {
    echo "📁 Cleaning up empty directories..."
    
    # Remove empty directories, but keep git metadata
    find docs_external -type d -empty -not -path "*.git*" -delete
    echo "  - Removed empty directories (keeping git metadata)"
}

# Function to reload important empty directories
reload_important_dirs() {
    echo "🔄 Reloading important directories..."
    
    # Reload Hardhat docs and examples
    if [ -d "docs_external/hardhat" ]; then
        echo "  - Reloading Hardhat documentation..."
        cd docs_external/hardhat
        
        # Copy README and docs from Hardhat repo if it exists
        if [ -f "hardhat-repo/README.md" ]; then
            cp hardhat-repo/README.md docs/ 2>/dev/null || echo "    ⚠️  Failed to copy Hardhat README"
        fi
        
        # Copy sample projects
        if [ -d "hardhat-repo/packages/hardhat-core/sample-projects" ]; then
            cp -r hardhat-repo/packages/hardhat-core/sample-projects/* examples/ 2>/dev/null || echo "    ⚠️  Failed to copy Hardhat examples"
        fi
        
        cd ../..
    fi
    
    # Reload 1inch docs
    if [ -d "docs_external/1inch" ]; then
        echo "  - Reloading 1inch documentation..."
        cd docs_external/1inch
        
        # Copy README files to docs
        if [ -f "1inch-sdk/README.md" ]; then
            cp 1inch-sdk/README.md docs/ 2>/dev/null || echo "    ⚠️  Failed to copy 1inch SDK README"
        fi
        
        if [ -f "limit-order-protocol/README.md" ]; then
            cp limit-order-protocol/README.md docs/ 2>/dev/null || echo "    ⚠️  Failed to copy LOP README"
        fi
        
        if [ -f "fusion-sdk/README.md" ]; then
            cp fusion-sdk/README.md docs/ 2>/dev/null || echo "    ⚠️  Failed to copy Fusion SDK README"
        fi
        
        cd ../..
    fi
    
    # Reload tutorials
    if [ -d "docs_external/tutorials" ]; then
        echo "  - Reloading tutorial content..."
        cd docs_external/tutorials
        
        # Copy security tutorials
        if [ -d "security/consensys-best-practices" ]; then
            cp security/consensys-best-practices/README.md security/ 2>/dev/null || echo "    ⚠️  Failed to copy security README"
        fi
        
        # Copy DeFi tutorials
        if [ -d "defi-integration/openzeppelin-contracts" ]; then
            cp defi-integration/openzeppelin-contracts/README.md defi-integration/ 2>/dev/null || echo "    ⚠️  Failed to copy DeFi README"
        fi
        
        cd ../..
    fi
}

# Function to validate cleanup
validate_cleanup() {
    echo "🔍 Validating cleanup results..."
    
    local empty_dirs=$(find docs_external -type d -empty | wc -l)
    local small_files=$(find docs_external -name "*.md" -size -100c | wc -l)
    
    echo "📊 Cleanup Results:"
    echo "  - Remaining empty directories: $empty_dirs"
    echo "  - Remaining small files: $small_files"
    
    # Count git metadata directories (these are normal)
    local git_dirs=$(find docs_external -type d -empty -path "*.git*" | wc -l)
    echo "  - Git metadata directories (normal): $git_dirs"
    
    # Count actual empty content directories
    local content_dirs=$(find docs_external -type d -empty -not -path "*.git*" | wc -l)
    echo "  - Actually empty content directories: $content_dirs"
}

# Main execution
main() {
    echo "🧹 Starting comprehensive documentation cleanup..."
    
    cleanup_small_files
    echo ""
    
    cleanup_empty_dirs
    echo ""
    
    reload_important_dirs
    echo ""
    
    validate_cleanup
    
    echo ""
    echo "✅ Cleanup completed!"
    echo "📁 Your docs_external folder is now clean and optimized!"
}

# Run main function
main 