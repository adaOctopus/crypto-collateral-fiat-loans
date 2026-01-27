#!/bin/bash

# Setup script for Foundry dependencies

set -e

echo "Setting up Foundry dependencies..."

# Check if forge is installed
if ! command -v forge &> /dev/null; then
    echo "Foundry is not installed. Installing..."
    curl -L https://foundry.paradigm.xyz | bash
    foundryup
fi

echo "Installing forge-std..."
forge install foundry-rs/forge-std

echo "Installing OpenZeppelin contracts..."
forge install OpenZeppelin/openzeppelin-contracts

echo "✓ Foundry setup complete!"
echo ""
echo "You can now run tests with: forge test -vv"
