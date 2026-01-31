# Collateral Crypto - Fiat Currency Loans Platform

A fullstack Web3 application that allows users to lock their cryptocurrency as collateral to receive fiat currency loans, enabling them to access liquidity without selling their crypto holdings.

## Architecture Overview

This application consists of three main components:

1. **Smart Contracts** (`/contracts`) - Ethereum smart contracts for collateral locking, NFT verification, and liquidation mechanisms
2. **Frontend** (`/frontend`) - NextJS 15 application with App Router, TypeScript, and modern Web3 UI
3. **Backend** (`/backend`) - Express API with TypeScript, MongoDB, and loan management logic

## Key Features

- **Collateral Locking**: Users can lock their crypto assets in a secure smart contract
- **Verification NFTs**: Users receive NFT tokens as proof of their locked collateral
- **Collateral Ratio Management**: Dynamic collateral ratios with liquidation thresholds
- **Interest Payment Tracking**: Backend system tracks monthly interest payments
- **Credit Scoring**: NFT-based credit scoring system for on-time payers
- **Proportional Withdrawals**: Users can unlock portions of collateral based on interest payments
- **Modern UI/UX**: Fully responsive design with light/dark mode support

## Tech Stack

- **Smart Contracts**: Solidity, Hardhat
- **Frontend**: NextJS 15, TypeScript, TailwindCSS, ethers.js/viem
- **Backend**: Node.js, Express, TypeScript, MongoDB, Mongoose, Zod
- **Testing**: Hardhat, Chai, Foundry (Forge)

## Project Structure

```
collateral-crypto/
├── contracts/          # Smart contracts and Hardhat configuration
├── frontend/           # NextJS application
├── backend/            # Express API server
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- MongoDB instance (local or cloud)
- Ethereum wallet with testnet ETH (for testing)
- MetaMask or compatible Web3 wallet

### Installation

1. **Clone and install dependencies:**

```bash
# Install contract dependencies
cd contracts
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

2. **Configure environment variables:**

See `.env.example` files in each directory for required environment variables.

**Quick Setup:**
- `contracts/.env.example` → Copy to `contracts/.env`
- `backend/.env.example` → Copy to `backend/.env`
- `frontend/.env.example` → Copy to `frontend/.env.local`

**For detailed local testing instructions, see [LOCAL_TESTING_GUIDE.md](./LOCAL_TESTING_GUIDE.md)**

3. **Compile and deploy smart contracts:**

```bash
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy.ts --network <network>
```

The frontend imports ABIs from `contracts/artifacts/`. After changing contracts, run `npx hardhat compile` so the frontend uses the latest ABIs.

4. **Start the backend:**

```bash
cd backend
npm run dev
```

5. **Start the frontend:**

```bash
cd frontend
npm run dev
```

### Demo on Sepolia with WETH

To demo the app on Sepolia using ETH as collateral:

1. Deploy contracts to Sepolia (`npx hardhat run scripts/deploy.ts --network sepolia`). The deploy script automatically enables **WETH** (Wrapped ETH) on CollateralLock and sets the ETH price (default 2000 USD; override with `ETH_PRICE_USD` in `contracts/.env`).
2. Get Sepolia ETH from a faucet (e.g. [Alchemy](https://sepoliafaucet.com/)).
3. Wrap some ETH into WETH (e.g. on [Sepolia Etherscan](https://sepolia.etherscan.io/) → WETH contract → Write → `deposit()`).
4. In the frontend, select **WETH (Wrapped ETH)** as the collateral token, enter amount and loan amount in USD, then lock collateral.

**If you get "Token not supported" on lock:** The CollateralLock contract only accepts tokens that the owner has enabled. If you deployed before WETH was added to the deploy script, or the enable step failed, run once:

```bash
cd contracts
npx hardhat run scripts/enable-weth.ts --network sepolia
```

This calls `setSupportedToken(WETH, true)` and `setTokenPrice(WETH, ETH_PRICE_USD)` on your deployed CollateralLock. Your deployer key (in `contracts/.env`) must be the contract owner.

### When the lock transaction shows "Fail" and Etherscan / RPC don't return the reason

If the lock tx fails and you only see "Fail" (no revert message), use the **fork debug script** to get the exact revert reason on your machine:

1. In `contracts/.env` set:
   - `SEPOLIA_RPC_URL` (e.g. your Alchemy Sepolia URL)
   - `COLLATERAL_LOCK_CONTRACT_ADDRESS`
   - `USER_ADDRESS` = **your wallet address** (the one that is trying to lock, e.g. your MetaMask address)

2. Run:

```bash
cd contracts
USER_ADDRESS=0xYourMetaMaskAddress npx hardhat run scripts/debug-lock-revert.ts --network hardhat
```

Optional: `DEBUG_AMOUNT=0.0001` and `DEBUG_LOAN_USD=0.00003` to match your test amounts (defaults are 0.0001 and 0.00003).

The script forks Sepolia, impersonates your wallet, and simulates `lockCollateral` with the same args. It prints:

- Whether **VerificationNFT.minter** is set to CollateralLock (if not, deployer must call `VerificationNFT.setMinter(CollateralLock)`).
- Your **WETH balance** and **allowance** on the fork (so you can see insufficient balance/allowance before the revert).
- The **exact revert reason** if the call reverts (e.g. "Transfer failed", "Insufficient collateral", "Token price not set").

If you see "Transaction reverted without a reason string" but balance/allowance are sufficient, the revert may be inside the token (e.g. WETH). Ensure you have approved the CollateralLock contract and have enough WETH.

## Documentation

- [Local Testing Guide](./LOCAL_TESTING_GUIDE.md) - **Complete guide to run and test locally**
- [Foundry Tests Guide](./contracts/FOUNDRY_TESTS.md) - **Smart contract unit tests with Foundry**
- [Quick Test Guide](./contracts/QUICK_TEST_GUIDE.md) - Quick reference for running Foundry tests
- [Smart Contract Design Decisions](./contracts/DESIGN.md) - Architecture and security considerations
- [Frontend Integration Guide](./frontend/INTEGRATION.md) - Contract interaction implementation
- [Setup Guide](./SETUP.md) - Quick setup reference

## Security Considerations

- Smart contracts include protection against front-running and sandwich attacks
- Collateral ratios are managed with liquidation thresholds
- Interest payment validation is enforced in the backend
- All user data is validated using Zod schemas

## License

MIT
