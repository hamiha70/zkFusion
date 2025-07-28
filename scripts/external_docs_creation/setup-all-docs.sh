#!/bin/bash
# File: scripts/setup-all-docs.sh

echo "🚀 Complete zkFusion documentation setup starting..."

# Make scripts executable
chmod +x scripts/setup-docs-external.sh
chmod +x scripts/clone-high-priority-docs.sh
chmod +x scripts/download-docs.sh
chmod +x scripts/setup-medium-priority.sh

# Run all setup scripts
./setup-docs-external.sh
./clone-high-priority-docs.sh
./download-docs.sh
./setup-medium-priority.sh

echo "🎉 Complete setup finished!"
echo ""
echo "📊 Summary:"
echo "- docs_external/ directory structure created"
echo "- High priority repositories cloned"
echo "- Documentation downloaded where possible"
echo "- Medium priority resources set up"
echo ""
echo "📁 Your docs_external folder is ready for Cursor integration!" 