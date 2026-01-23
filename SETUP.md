# Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
# From project root
npm run install:all
```

Or install individually:

```bash
cd contracts && npm install
cd ../backend && npm install
cd ../frontend && npm install
```

### 2. Environment Configuration

#### Contracts (.env in contracts/)
```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
PRIVATE_KEY=your_deployment_wallet_private_key
```

#### Backend (.env in backend/)
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/collateral-crypto
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
COLLATERAL_LOCK_CONTRACT_ADDRESS=0x... # After deployment
VERIFICATION_NFT_CONTRACT_ADDRESS=0x... # After deployment
```

#### Frontend (.env.local in frontend/)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_COLLATERAL_LOCK_ADDRESS=0x... # After deployment
NEXT_PUBLIC_VERIFICATION_NFT_ADDRESS=0x... # After deployment
```

### 3. Deploy Contracts

```bash
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy.ts --network sepolia
```

Copy the deployed addresses to your backend and frontend .env files.

### 4. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` to see the app.

## Testing

### Smart Contracts
```bash
cd contracts
npm test
```

### Backend API
Test endpoints using curl or Postman:
- `POST /api/users/register` - Register user
- `GET /api/positions/user/:address` - Get positions
- `POST /api/payments/record` - Record payment

## Common Issues

### Contract Deployment Fails
- Ensure you have testnet ETH in your deployment wallet
- Check RPC URL is correct and accessible
- Verify private key is set correctly

### Frontend Can't Connect to Wallet
- Ensure MetaMask or compatible wallet is installed
- Check that you're on the correct network (Sepolia for testing)
- Clear browser cache and reload

### Backend MongoDB Connection Error
- Ensure MongoDB is running locally or update MONGODB_URI
- Check connection string format

### Type Errors
- Run `npm install` in each directory
- Ensure TypeScript version matches across projects
- Clear node_modules and reinstall if needed

## Production Deployment

1. **Contracts**: Deploy to mainnet with proper verification
2. **Backend**: Deploy to cloud (AWS, Heroku, etc.) with production MongoDB
3. **Frontend**: Deploy to Vercel, Netlify, or similar
4. **Update**: All contract addresses in production environment variables
5. **Security**: Review all environment variables and API keys
