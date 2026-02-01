# Upgradeable Contract Versions (UUPS)

This folder contains upgradeable versions of the main Collateral Crypto contracts, using the **UUPS (Universal Upgradeable Proxy Standard)** pattern. These are reference implementations for demonstrating upgradeability—the main app uses the non-upgradeable contracts in `../`.

## Contracts

| Contract | Description |
|----------|-------------|
| `VerificationNFTUpgradeable.sol` | Upgradeable ERC721 for verification tokens and credit scoring |
| `CollateralLockUpgradeable.sol` | Upgradeable collateral lock and loan management |
| `LoanSecuritizationUpgradeable.sol` | Upgradeable ERC1155 loan securitization and fraction sales |
| `IVerificationNFTUpgradeable.sol` | Interface for VerificationNFT (used by CollateralLock) |

## Compilation

The upgradeable contracts require **Solidity ^0.8.22** (OpenZeppelin 5.4 dependency). Use **Foundry** to compile:

```bash
forge build
```

For **Hardhat**, add Solidity 0.8.24 as an additional compiler in `hardhat.config.ts` if needed, then:

```bash
npx hardhat compile
```

## Deployment

After compilation, deploy with the upgradeable script:

```bash
npx hardhat run scripts/deploy-upgradeable.ts --network sepolia
```

This deploys UUPS proxies for each contract. The **proxy addresses** are what you use in the frontend/backend—they expose the same interface as the non-upgradeable versions.

## Upgrading

To upgrade an implementation (e.g. CollateralLock):

1. Deploy a new implementation contract (e.g. `CollateralLockUpgradeableV2`).
2. Call `upgradeToAndCall(newImplementation, "0x")` on the proxy as owner.
3. Users keep using the same proxy address—no migration needed.

**Storage layout:** When upgrading, new state variables must be appended; do not remove or reorder existing ones.
