# Foundry Tests Documentation

## Overview

This project uses **Foundry** (Forge) for smart contract testing. Foundry is a fast, portable, and modular testing framework written in Solidity.

## Test Files

### 1. `VerificationNFT.t.sol`
Tests for the VerificationNFT contract covering:
- ✅ Contract deployment and initialization
- ✅ NFT minting functionality
- ✅ Initial credit score (defaults to 50)
- ✅ Credit score updates (on-time and late payments)
- ✅ Payment history tracking
- ✅ User token retrieval
- ✅ Access control (only owner can mint)
- ✅ Error handling (invalid scores, non-existent tokens)

**Key Test Functions:**
- `test_Deployment()` - Verifies contract name, symbol, and owner
- `test_MintNFT()` - Tests NFT minting and metadata
- `test_UpdateCreditScore()` - Tests credit score updates for on-time payments
- `test_UpdateCreditScoreLate()` - Tests credit score updates for late payments
- `test_GetUserTokens()` - Verifies user can retrieve all their tokens

### 2. `CollateralLock.t.sol`
Tests for the CollateralLock contract covering:
- ✅ Contract deployment and setup
- ✅ Token management (add/remove supported tokens)
- ✅ Price oracle updates
- ✅ Collateral locking with NFT minting
- ✅ Collateral unlocking (proportional withdrawals)
- ✅ Liquidation mechanism
- ✅ Position health checks
- ✅ Access control (owner-only functions)
- ✅ Error handling (insufficient collateral, unsupported tokens, etc.)

**Key Test Functions:**
- `test_LockCollateral()` - Tests full collateral locking flow
- `test_UnlockCollateral()` - Tests proportional collateral unlocking
- `test_LiquidatePosition()` - Tests liquidation when ratio falls below threshold
- `test_IsPositionHealthy()` - Verifies position health calculations
- `test_RevertLockCollateralInsufficientRatio()` - Tests minimum ratio enforcement

## Running Tests

### Prerequisites

1. **Install Foundry:**
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. **Install dependencies:**
```bash
cd contracts
forge install foundry-rs/forge-std
forge install OpenZeppelin/openzeppelin-contracts
```

### Run All Tests

**Option 1: Using the script (recommended)**
```bash
cd contracts
chmod +x scripts/run-tests.sh
./scripts/run-tests.sh
```

**Option 2: Direct forge command**
```bash
cd contracts
forge test -vv
```

**Output:**
```
[PASS] test_Deployment() (gas: 12345)
[PASS] test_MintNFT() (gas: 23456)
[PASS] test_LockCollateral() (gas: 34567)
...
Test result: ok. 15 passed; 0 failed; finished in 2.34s
```

### Run Tests Individually

**Option 1: Using the script**
```bash
cd contracts
chmod +x scripts/run-test-individual.sh
./scripts/run-test-individual.sh
```

**Option 2: Run specific test contract**
```bash
# Run only VerificationNFT tests
forge test --match-contract VerificationNFTTest -vv

# Run only CollateralLock tests
forge test --match-contract CollateralLockTest -vv
```

**Option 3: Run specific test function**
```bash
# Run single test function
forge test --match-test test_LockCollateral -vv

# Run tests matching pattern
forge test --match-test "test_Revert*" -vv  # All revert tests
```

### Verbosity Levels

- `-v` - Show test results
- `-vv` - Show execution traces for failing tests
- `-vvv` - Show execution traces for all tests
- `-vvvv` - Show detailed traces and setup

### Example Output

```
Running 15 tests for test/CollateralLock.t.sol:CollateralLockTest
[PASS] test_Deployment() (gas: 123456)
[PASS] test_SetSupportedToken() (gas: 23456)
[PASS] test_LockCollateral() (gas: 345678)
[PASS] test_UnlockCollateral() (gas: 234567)
[PASS] test_LiquidatePosition() (gas: 456789)
[PASS] test_IsPositionHealthy() (gas: 12345)
[PASS] test_RevertLockCollateralInsufficientRatio() (gas: 1234)
[PASS] test_RevertLockCollateralUnsupportedToken() (gas: 1234)
[PASS] test_RevertUnlockCollateralBreachesRatio() (gas: 1234)
[PASS] test_RevertUnlockCollateralNotOwner() (gas: 1234)
[PASS] test_RevertLiquidateHealthyPosition() (gas: 1234)
[PASS] test_ClosePosition() (gas: 234567)
[PASS] test_GetUserPositions() (gas: 345678)
Test result: ok. 13 passed; 0 failed; finished in 1.23s

Running 9 tests for test/VerificationNFT.t.sol:VerificationNFTTest
[PASS] test_Deployment() (gas: 12345)
[PASS] test_MintNFT() (gas: 23456)
[PASS] test_InitialCreditScore() (gas: 1234)
[PASS] test_UpdateCreditScore() (gas: 2345)
[PASS] test_UpdateCreditScoreLate() (gas: 2345)
[PASS] test_RevertUpdateCreditScoreExceedsMax() (gas: 1234)
[PASS] test_RevertUpdateCreditScoreNonExistent() (gas: 1234)
[PASS] test_GetUserTokens() (gas: 3456)
[PASS] test_GetTokenUser() (gas: 1234)
[PASS] test_RevertMintFromNonOwner() (gas: 1234)
Test result: ok. 10 passed; 0 failed; finished in 0.89s
```

## Test Coverage

### VerificationNFT Contract
- ✅ Deployment and initialization
- ✅ NFT minting (owner only)
- ✅ Credit score management
- ✅ Payment history tracking
- ✅ User token queries
- ✅ Access control
- ✅ Error handling

### CollateralLock Contract
- ✅ Deployment and setup
- ✅ Token management (supported tokens, prices)
- ✅ Collateral locking
- ✅ Collateral unlocking
- ✅ Liquidation
- ✅ Position queries
- ✅ Health checks
- ✅ Access control
- ✅ Error handling (insufficient collateral, unsupported tokens, etc.)

## Test Structure

Each test file follows this structure:
1. **setUp()** - Deploys contracts and sets up test environment
2. **test_*** functions - Test positive cases
3. **test_Revert*** functions - Test error cases and access control

## Common Commands

```bash
# Run all tests
forge test

# Run with gas reporting
forge test --gas-report

# Run specific test
forge test --match-test test_LockCollateral

# Run with detailed traces
forge test -vvv

# Run and show coverage
forge coverage

# Format code
forge fmt

# Build contracts
forge build
```

## Troubleshooting

### Issue: "forge: command not found"
**Solution:** Install Foundry using `foundryup`

### Issue: "OpenZeppelin contracts not found"
**Solution:** Run `forge install OpenZeppelin/openzeppelin-contracts`

### Issue: Tests fail with "EvmError: Revert"
**Solution:** Check test setup and ensure all contracts are deployed correctly in `setUp()`

### Issue: "Insufficient funds" errors
**Solution:** This shouldn't happen in tests, but if it does, check mock token setup

## Notes

- Tests use `forge-std/Test.sol` for testing utilities
- Mock ERC20 token is used for testing collateral operations
- All tests are isolated and don't depend on external state
- Gas costs are reported for optimization analysis
- Tests cover both happy paths and error cases
