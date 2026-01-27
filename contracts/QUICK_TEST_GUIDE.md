# Quick Test Guide - Foundry Tests

## Installation

```bash
# Install Foundry (if not already installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install OpenZeppelin contracts
cd contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit
```

## Running Tests

### Run All Tests Together

```bash
cd contracts
forge test -vv
```

**Or use the script:**
```bash
./scripts/run-tests.sh
```

**Expected Output:**
```
Running 15 tests for test/CollateralLock.t.sol:CollateralLockTest
[PASS] test_Deployment() (gas: 123456)
[PASS] test_LockCollateral() (gas: 345678)
...
Test result: ok. 15 passed; 0 failed

Running 10 tests for test/VerificationNFT.t.sol:VerificationNFTTest
[PASS] test_Deployment() (gas: 12345)
[PASS] test_MintNFT() (gas: 23456)
...
Test result: ok. 10 passed; 0 failed
```

### Run Tests One by One

**Option 1: Run specific test contract**
```bash
# VerificationNFT tests only
forge test --match-contract VerificationNFTTest -vv

# CollateralLock tests only
forge test --match-contract CollateralLockTest -vv
```

**Option 2: Run specific test function**
```bash
# Single test
forge test --match-test test_LockCollateral -vv

# All revert tests
forge test --match-test "test_Revert*" -vv
```

**Option 3: Use the script**
```bash
./scripts/run-test-individual.sh
```

## Test Summary

### VerificationNFT Tests (10 tests)
- ✅ Deployment and initialization
- ✅ NFT minting
- ✅ Credit score management
- ✅ Payment history tracking
- ✅ Access control

### CollateralLock Tests (15 tests)
- ✅ Deployment and setup
- ✅ Token management
- ✅ Collateral locking
- ✅ Collateral unlocking
- ✅ Liquidation
- ✅ Position health checks
- ✅ Error handling

## Verbosity Levels

- `-v` - Basic output
- `-vv` - Show traces for failing tests (recommended)
- `-vvv` - Show traces for all tests
- `-vvvv` - Detailed traces

## Common Issues

**"forge: command not found"**
→ Install Foundry: `foundryup`

**"OpenZeppelin not found"**
→ Run: `forge install OpenZeppelin/openzeppelin-contracts --no-commit`

For detailed documentation, see [FOUNDRY_TESTS.md](./FOUNDRY_TESTS.md)
