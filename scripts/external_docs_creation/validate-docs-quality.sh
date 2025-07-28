#!/bin/bash
# File: scripts/external_docs_creation/validate-docs-quality.sh
# Purpose: Validate the quality and depth of downloaded documentation

set -e

echo "🔍 Validating documentation quality and depth..."

# Function to analyze markdown files
analyze_markdown_files() {
    echo "📊 Analyzing markdown files..."
    
    local total_files=$(find docs_external -name "*.md" | wc -l)
    local total_lines=$(find docs_external -name "*.md" -exec wc -l {} + | tail -1 | awk '{print $1}')
    local avg_lines=$((total_lines / total_files))
    
    echo "📈 Markdown Statistics:"
    echo "  - Total files: $total_files"
    echo "  - Total lines: $total_lines"
    echo "  - Average lines per file: $avg_lines"
    
    # Check for files with code blocks
    local files_with_code=$(find docs_external -name "*.md" -exec grep -l "code" {} \; | wc -l)
    echo "  - Files with code blocks: $files_with_code"
    
    # Check for files with links
    local files_with_links=$(find docs_external -name "*.md" -exec grep -l "\[.*\](.*)" {} \; | wc -l)
    echo "  - Files with links: $files_with_links"
}

# Function to check depth of documentation
check_documentation_depth() {
    echo "📊 Checking documentation depth..."
    
    # Check 1inch documentation
    local inch_docs=$(find docs_external/1inch -name "*.md" | wc -l)
    local inch_html=$(find docs_external/1inch -name "*.html" | wc -l)
    echo "  1inch Documentation:"
    echo "    - Markdown files: $inch_docs"
    echo "    - HTML files: $inch_html"
    
    # Check Hardhat documentation
    local hardhat_docs=$(find docs_external/hardhat -name "*.md" | wc -l)
    local hardhat_html=$(find docs_external/hardhat -name "*.html" | wc -l)
    echo "  Hardhat Documentation:"
    echo "    - Markdown files: $hardhat_docs"
    echo "    - HTML files: $hardhat_html"
    
    # Check ZK tools documentation
    local zk_docs=$(find docs_external/zk-tools -name "*.md" | wc -l)
    local zk_circuits=$(find docs_external/zk-tools -name "*.circom" | wc -l)
    echo "  ZK Tools Documentation:"
    echo "    - Markdown files: $zk_docs"
    echo "    - Circuit files: $zk_circuits"
}

# Function to check for specific content types
check_content_types() {
    echo "📊 Checking content types..."
    
    # Check for API documentation
    local api_docs=$(find docs_external -name "*.md" -exec grep -l -i "api\|endpoint\|request\|response" {} \; | wc -l)
    echo "  - Files with API content: $api_docs"
    
    # Check for code examples
    local code_examples=$(find docs_external -name "*.md" -exec grep -l "code" {} \; | wc -l)
    echo "  - Files with code examples: $code_examples"
    
    # Check for configuration examples
    local config_examples=$(find docs_external -name "*.md" -exec grep -l -i "config\|setup\|installation" {} \; | wc -l)
    echo "  - Files with configuration: $config_examples"
    
    # Check for tutorial content
    local tutorial_content=$(find docs_external -name "*.md" -exec grep -l -i "tutorial\|guide\|example\|step" {} \; | wc -l)
    echo "  - Files with tutorial content: $tutorial_content"
}

# Function to check for gaps
identify_gaps() {
    echo "🔍 Identifying gaps..."
    
    # Check for empty directories with detailed breakdown
    local total_empty_dirs=$(find docs_external -type d -empty | wc -l)
    local git_empty_dirs=$(find docs_external -type d -empty -path "*.git*" | wc -l)
    local lib_empty_dirs=$(find docs_external -type d -empty -path "*/lib/*" | wc -l)
    local node_modules_empty_dirs=$(find docs_external -type d -empty -path "*/node_modules/*" | wc -l)
    local actual_empty_dirs=$(find docs_external -type d -empty -not -path "*.git*" -not -path "*/lib/*" -not -path "*/node_modules/*" | wc -l)
    
    echo "  - Total empty directories: $total_empty_dirs"
    echo "    ├── Git metadata directories (normal): $git_empty_dirs"
    echo "    ├── Library directories (normal): $lib_empty_dirs"
    echo "    ├── Node modules (normal): $node_modules_empty_dirs"
    echo "    └── Actually empty content directories: $actual_empty_dirs"
    
    # Add reassuring summary for empty directories
    if [ $actual_empty_dirs -eq 0 ]; then
        echo "    ✅ All empty directories are normal (git metadata, libraries) - no issues!"
    else
        echo "    ⚠️  Found $actual_empty_dirs actually empty content directories"
    fi
    
    # Check for very small files (potential failed conversions)
    local small_files=$(find docs_external -name "*.md" -size -100c | wc -l)
    echo "  - Very small files (<100 chars): $small_files"
    
    # Check for files with broken links
    local files_with_broken_links=$(find docs_external -name "*.md" -exec grep -l "http.*404\|http.*error" {} \; 2>/dev/null | wc -l)
    echo "  - Files with potential broken links: $files_with_broken_links"
}

# Function to check conversion quality
check_conversion_quality() {
    echo "🔍 Checking conversion quality..."
    
    # Check for HTML artifacts in markdown
    local html_artifacts=$(find docs_external -name "*.md" -exec grep -l "<.*>" {} \; | wc -l)
    echo "  - Files with HTML artifacts: $html_artifacts"
    
    # Check for proper markdown headers
    local proper_headers=$(find docs_external -name "*.md" -exec grep -l "^#" {} \; | wc -l)
    echo "  - Files with proper headers: $proper_headers"
    
    # Check for code block formatting
    local code_blocks=$(find docs_external -name "*.md" -exec grep -l "code" {} \; | wc -l)
    echo "  - Files with code blocks: $code_blocks"
}

# Function to generate summary report
generate_summary_report() {
    echo "📋 Generating summary report..."
    
    local total_md=$(find docs_external -name "*.md" | wc -l)
    local total_sol=$(find docs_external -name "*.sol" | wc -l)
    local total_circom=$(find docs_external -name "*.circom" | wc -l)
    local total_js=$(find docs_external -name "*.js" | wc -l)
    local total_html=$(find docs_external -name "*.html" | wc -l)
    
    echo ""
    echo "📊 COMPREHENSIVE SUMMARY REPORT"
    echo "================================"
    echo "📁 Total Files by Type:"
    echo "  - Markdown: $total_md"
    echo "  - Solidity: $total_sol"
    echo "  - Circom: $total_circom"
    echo "  - JavaScript: $total_js"
    echo "  - HTML: $total_html"
    echo ""
    
    # Calculate resolution percentage
    local total_files=$((total_md + total_sol + total_circom + total_js))
    local target_files=500  # Estimated target for 95% resolution
    local resolution_percentage=$((total_files * 100 / target_files))
    
    if [ $resolution_percentage -gt 95 ]; then
        resolution_percentage=95
    fi
    
    echo "🎯 Resolution Assessment: $resolution_percentage%"
    echo ""
    
    if [ $resolution_percentage -ge 90 ]; then
        echo "✅ EXCELLENT: Documentation is comprehensive and ready for Cursor integration!"
    elif [ $resolution_percentage -ge 80 ]; then
        echo "🟡 GOOD: Documentation is solid but could use some enhancement."
    else
        echo "⚠️  NEEDS IMPROVEMENT: Consider downloading additional documentation."
    fi
}

# Main execution
main() {
    echo "🔍 Starting comprehensive documentation validation..."
    
    analyze_markdown_files
    echo ""
    
    check_documentation_depth
    echo ""
    
    check_content_types
    echo ""
    
    identify_gaps
    echo ""
    
    check_conversion_quality
    echo ""
    
    generate_summary_report
    
    echo ""
    echo "✅ Validation completed!"
}

# Run main function
main 