# Environment Variables Setup Guide

This document explains where to configure environment variables for each part of the application.

## File Locations

Each directory has its own `.env.example` file that you should copy to `.env` (or `.env.local` for frontend):

```
collateral-crypto/
├── contracts/
│   └── .env.example  → Copy to .env
├── backend/
│   └── .env.example  → Copy to .env
└── frontend/
    └── .env.example  → Copy to .env.local (Next.js convention)
```

## Quick Setup Steps

### 1. Contracts Directory

```bash
cd contracts
cp .env.example .env
# Edit .env and add your values
```

**Required Variables:**
- `SEPOLIA_RPC_URL` - For testnet deployment
- `MAINNET_RPC_URL` - For mainnet deployment  
- `PRIVATE_KEY` - Your deployment wallet private key

### 2. Backend Directory

```bash
cd backend
cp .env.example .env
# Edit .env and add your values
```

**Required Variables:**
- `PORT` - Server port (default: 3001)
- `MONGODB_URI` - MongoDB connection string
- `ETHEREUM_RPC_URL` - For reading contract state
- `COLLATERAL_LOCK_CONTRACT_ADDRESS` - **Set after deployment**
- `VERIFICATION_NFT_CONTRACT_ADDRESS` - **Set after deployment**

### 3. Frontend Directory

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local and add your values
```

**Required Variables:**
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_COLLATERAL_LOCK_ADDRESS` - **Set after deployment**
- `NEXT_PUBLIC_VERIFICATION_NFT_ADDRESS` - **Set after deployment**
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` - Optional

## Deployment Workflow

1. **Deploy Contracts First:**
   ```bash
   cd contracts
   npx hardhat run scripts/deploy.ts --network sepolia
   ```
   This will output contract addresses.

2. **Update Backend .env:**
   Copy the contract addresses to `backend/.env`

3. **Update Frontend .env.local:**
   Copy the contract addresses to `frontend/.env.local`

## Where Contract Addresses Are Used

### In Code:

**Backend:**
- `src/services/contractService.ts` - Reads from `process.env.COLLATERAL_LOCK_CONTRACT_ADDRESS`
- `src/services/contractService.ts` - Reads from `process.env.VERIFICATION_NFT_CONTRACT_ADDRESS`

**Frontend:**
- `app/lib/contracts.ts` - Reads from `process.env.NEXT_PUBLIC_COLLATERAL_LOCK_ADDRESS`
- `app/lib/contracts.ts` - Reads from `process.env.NEXT_PUBLIC_VERIFICATION_NFT_ADDRESS`

### Network Configuration:

**Contracts:**
- `hardhat.config.ts` - Uses `SEPOLIA_RPC_URL` and `MAINNET_RPC_URL` from `.env`
- Networks are configured in `hardhat.config.ts` (sepolia, mainnet, localhost)

## Security Notes

⚠️ **NEVER commit .env files to git!**

- All `.env` files are in `.gitignore`
- Only `.env.example` files are committed (as templates)
- Keep your `PRIVATE_KEY` secure and never share it
- Use different wallets for testnet vs mainnet

## Getting RPC URLs

### Infura (Recommended)
1. Sign up at https://infura.io
2. Create a new project
3. Copy the project ID
4. Use format: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`

### Alchemy
1. Sign up at https://alchemy.com
2. Create a new app
3. Copy the API key
4. Use format: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`

## Getting MongoDB URI

### Local MongoDB
```bash
# Install MongoDB locally, then use:
MONGODB_URI=mongodb://localhost:27017/collateral-crypto
```

### MongoDB Atlas (Cloud)
1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string
4. Format: `mongodb+srv://username:password@cluster.mongodb.net/collateral-crypto`
