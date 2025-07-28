#!/bin/bash

# Setup Powers of Tau file for zkFusion circuits
# Usage: ./setup-ptau.sh [N] where N is the number of bidders (4, 8, or 16)

set -e

CIRCUIT_SIZE=${1:-8}  # Default N=8 for hackathon demos
CIRCUITS_DIR="$(dirname "$0")/../../circuits"

# Determine required power of tau based on circuit size
case $CIRCUIT_SIZE in
  4)  
    POWER=12
    ESTIMATED_CONSTRAINTS=1804
    SIZE="~2MB"
    PROVING_TIME="2-5 seconds"
    ;;
  8)  
    POWER=13  
    ESTIMATED_CONSTRAINTS=7216
    SIZE="~3MB"
    PROVING_TIME="8-20 seconds"
    ;;
  16) 
    POWER=15
    ESTIMATED_CONSTRAINTS=28864
    SIZE="~12MB" 
    PROVING_TIME="32-80 seconds"
    ;;
  *)  
    echo "❌ Unsupported circuit size: $CIRCUIT_SIZE"
    echo "   Supported sizes: 4, 8, 16"
    exit 1
    ;;
esac

PTAU_FILE="pot${POWER}_final.ptau"
PTAU_PATH="$CIRCUITS_DIR/$PTAU_FILE"

echo "🔧 Setting up Powers of Tau for zkFusion"
echo "   Circuit size: N=$CIRCUIT_SIZE bidders"
echo "   Estimated constraints: $ESTIMATED_CONSTRAINTS"
echo "   Required power: 2^$POWER"
echo "   File size: $SIZE"
echo "   Expected proving time: $PROVING_TIME"
echo ""

# Create circuits directory if it doesn't exist
mkdir -p "$CIRCUITS_DIR"

# Check if ptau file already exists
if [ -f "$PTAU_PATH" ]; then
  echo "✅ Powers of Tau file already exists: $PTAU_FILE"
  echo "   Use --force to regenerate"
  if [ "$2" != "--force" ]; then
    exit 0
  fi
  echo "🔄 Regenerating due to --force flag..."
  rm "$PTAU_PATH"
fi

echo "🚀 Generating Powers of Tau ceremony (this may take a few minutes)..."

# Generate new powers of tau
echo "   Step 1/2: Generating initial ceremony..."
npx snarkjs powersoftau new bn128 $POWER "$PTAU_PATH" -v

echo "   Step 2/2: Preparing for phase 2..."
npx snarkjs powersoftau prepare phase2 "$PTAU_PATH" "$PTAU_PATH" -v

# Verify the file was created successfully
if [ -f "$PTAU_PATH" ]; then
  FILE_SIZE=$(du -h "$PTAU_PATH" | cut -f1)
  echo ""
  echo "✅ Powers of Tau ceremony completed successfully!"
  echo "   Generated: $PTAU_FILE ($FILE_SIZE)"
  echo "   Location: $PTAU_PATH"
  echo ""
  echo "🔧 Next steps:"
  echo "   npm run circuit:setup    # Run trusted setup ceremony"
  echo "   npm run circuit:prove    # Generate your first proof"
else
  echo "❌ Failed to generate Powers of Tau file"
  exit 1
fi 