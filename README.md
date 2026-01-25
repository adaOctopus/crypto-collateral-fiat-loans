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
- **Testing**: Hardhat, Chai

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

3. **Deploy smart contracts:**

```bash
cd contracts
npx hardhat run scripts/deploy.ts --network <network>
```

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

## Documentation

- [Local Testing Guide](./LOCAL_TESTING_GUIDE.md) - **Complete guide to run and test locally**
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
