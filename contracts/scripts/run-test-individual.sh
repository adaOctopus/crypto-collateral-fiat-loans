#!/bin/bash

# Individual Test Runner Script
# Run specific test files one by one

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if forge is installed
if ! command -v forge &> /dev/null; then
    echo -e "${YELLOW}Foundry (forge) is not installed. Installing...${NC}"
    curl -L https://foundry.paradigm.xyz | bash
    foundryup
fi

echo "=========================================="
echo "  Running Tests Individually"
echo "=========================================="
echo ""

# Test files
TESTS=(
    "test/VerificationNFT.t.sol:VerificationNFTTest"
    "test/CollateralLock.t.sol:CollateralLockTest"
)

for test in "${TESTS[@]}"; do
    echo -e "${BLUE}Running: ${test}${NC}"
    echo "----------------------------------------"
    forge test --match-contract "$(basename $test | cut -d: -f2)" -vv
    echo -e "${GREEN}✓ Completed: ${test}${NC}"
    echo ""
done

echo -e "${GREEN}✓ All individual tests completed!${NC}"
