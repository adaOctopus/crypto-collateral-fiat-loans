#!/bin/bash

# Foundry Test Runner Script
# This script runs all Foundry tests with nice output

set -e

echo "=========================================="
echo "  Foundry Test Suite - Collateral Crypto"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if forge is installed
if ! command -v forge &> /dev/null; then
    echo -e "${YELLOW}Foundry (forge) is not installed. Installing...${NC}"
    curl -L https://foundry.paradigm.xyz | bash
    foundryup
fi

echo -e "${BLUE}Running all tests...${NC}"
echo ""

# Run all tests with verbose output
forge test -vv

echo ""
echo -e "${GREEN}✓ All tests completed!${NC}"
