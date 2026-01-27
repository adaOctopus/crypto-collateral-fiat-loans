# Foundry Setup Instructions

## Quick Fix for "forge-std/Test.sol not found" Error

Run this command to install required dependencies:

```bash
cd contracts
./scripts/setup-foundry.sh
```

Or manually:

```bash
cd contracts

# Install Foundry (if not installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install forge-std library
forge install foundry-rs/forge-std

# Install OpenZeppelin contracts
forge install OpenZeppelin/openzeppelin-contracts
```

After installation, the `lib/forge-std/` directory will be created and the imports will work.

## Verify Installation

```bash
forge test -vv
```

If you see test results, the setup is complete!
