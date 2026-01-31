# Local Testing Guide

Complete step-by-step guide to run and test the application locally.

## Prerequisites

1. **Node.js 18+** installed
2. **MongoDB** running locally (or MongoDB Atlas account)
3. **MetaMask** browser extension installed
4. **Sepolia testnet ETH** in your wallet (get from faucets)
5. **Infura/Alchemy account** for RPC endpoints (free tier works)

## Step 1: Install Dependencies

```bash
# From project root
cd contracts && npm install
cd ../backend && npm install
cd ../frontend && npm install
```

Or use the root script:
```bash
npm run install:all
```

## Step 2: Set Up Environment Variables

### 2.1 Contracts Environment

```bash
cd contracts
cp .env.example .env
```

Edit `contracts/.env`:
```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
```

**Get Infura Project ID:**
1. Go to https://infura.io
2. Sign up/login
3. Create a new project
4. Copy the Project ID
5. Use: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`

**Get Private Key:**
1. Use MetaMask or create a test wallet
2. Export private key (Settings → Security & Privacy → Show Private Key)
3. ⚠️ Use a dedicated test wallet, NOT your main wallet!

### 2.2 Backend Environment

```bash
cd ../backend
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/collateral-crypto
ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
# Contract addresses will be filled after deployment
COLLATERAL_LOCK_CONTRACT_ADDRESS=
VERIFICATION_NFT_CONTRACT_ADDRESS=
```

**MongoDB Setup Options:**

**Option A: Local MongoDB**
```bash
# Install MongoDB locally, then:
mongod  # Start MongoDB service
```

**Option B: Docker MongoDB**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Option C: MongoDB Atlas (Cloud - Free)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

### 2.3 Frontend Environment

```bash
cd ../frontend
cp .env.example .env.local
```

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
# Contract addresses will be filled after deployment
NEXT_PUBLIC_COLLATERAL_LOCK_ADDRESS=
NEXT_PUBLIC_VERIFICATION_NFT_ADDRESS=
```

## Step 3: Deploy Contracts to Sepolia Testnet

### 3.1 Get Sepolia Testnet ETH

1. Go to https://sepoliafaucet.com or https://faucet.quicknode.com/ethereum/sepolia
2. Enter your wallet address
3. Request testnet ETH (you'll need ~0.1 ETH for deployment)

### 3.2 Compile Contracts

```bash
cd contracts
npx hardhat compile
```

### 3.3 Deploy Contracts

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

**Expected Output:**
```
Deploying contracts with account: 0xYourAddress...
Account balance: 100000000000000000

Deploying VerificationNFT...
VerificationNFT deployed to: 0xABC123...

Deploying CollateralLock...
CollateralLock deployed to: 0xDEF456...

=== Deployment Summary ===
Network: sepolia
VerificationNFT: 0xABC123...
CollateralLock: 0xDEF456...
```

### 3.4 Update Contract Addresses

**Update `backend/.env`:**
```env
COLLATERAL_LOCK_CONTRACT_ADDRESS=0xDEF456...
VERIFICATION_NFT_CONTRACT_ADDRESS=0xABC123...
```

**Update `frontend/.env.local`:**
```env
NEXT_PUBLIC_COLLATERAL_LOCK_ADDRESS=0xDEF456...
NEXT_PUBLIC_VERIFICATION_NFT_ADDRESS=0xABC123...
```

### 3.5 Set Up Supported Tokens (Optional)

For testing, you can use any ERC20 token on Sepolia. Common test tokens:
- USDC on Sepolia: Check Sepolia token lists
- Deploy your own test token using MockERC20.sol

To add a token to the contract:
```bash
# Using Hardhat console
npx hardhat console --network sepolia

# In console:
const CollateralLock = await ethers.getContractFactory("CollateralLock");
const lock = CollateralLock.attach("0xDEF456..."); // Your contract address
await lock.setSupportedToken("0xTokenAddress", true);
await lock.setTokenPrice("0xTokenAddress", ethers.parseEther("2000")); // $2000 per token
```

## Step 4: Start Backend Server

```bash
cd backend
npm run dev
```

**Expected Output:**
```
Connected to MongoDB
Server running on port 3001
```

**Test Backend:**
```bash
# Health check
curl http://localhost:3001/health

# Should return: {"status":"ok","timestamp":"..."}
```

## Step 5: Start Frontend

```bash
cd frontend
npm run dev
```

**Expected Output:**
```
- ready started server on 0.0.0.0:3000
- Local: http://localhost:3000
```

Open http://localhost:3000 in your browser.

## Step 6: Test the Application

### 6.1 Connect Wallet

1. Open http://localhost:3000
2. Click "Connect Wallet" button
3. Select MetaMask
4. Approve connection
5. Make sure you're on Sepolia testnet in MetaMask

### 6.2 Register User

1. Navigate to `/app` route
2. The app should automatically register your wallet address
3. Or use the API directly:
```bash
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0xYourAddress"}'
```

### 6.3 Lock Collateral

1. Go to "Lock Collateral" tab
2. Enter:
   - Token Address: Your test ERC20 token address
   - Collateral Amount: e.g., 10
   - Loan Amount (USD): e.g., 15000
3. Click "Lock Collateral"
4. Approve token spending in MetaMask
5. Confirm lock transaction in MetaMask

**Note:** You need to have the ERC20 token in your wallet and approve spending first.

### 6.4 View Positions

1. Go to "My Positions" tab
2. You should see your locked position with:
   - Collateral amount
   - Loan amount
   - Collateral ratio
   - Payment status

### 6.5 Record Interest Payment (Backend)

```bash
curl -X POST http://localhost:3001/api/payments/record \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0xYourAddress",
    "positionId": 0
  }'
```

### 6.6 Withdraw Collateral

1. Make at least 1 interest payment (via API above)
2. Go to "Withdraw" tab
3. Select position
4. Enter amount to unlock (max 25% per unlock)
5. Click "Withdraw Collateral"
6. Confirm transaction in MetaMask

## Troubleshooting

### Contracts Won't Deploy

- **Error: "insufficient funds"**
  - Get more Sepolia ETH from faucet
  - Check wallet has enough balance

- **Error: "nonce too low"**
  - Wait a few seconds and try again
  - Or reset MetaMask account nonce

### Backend Won't Start

- **MongoDB connection error**
  - Ensure MongoDB is running: `mongod` or `docker ps`
  - Check connection string in `.env`
  - Test connection: `mongosh mongodb://localhost:27017`

- **Port already in use**
  - Change PORT in `backend/.env`
  - Or kill process using port 3001: `lsof -ti:3001 | xargs kill`

### Frontend Won't Connect

- **"Wallet not connected"**
  - Ensure MetaMask is installed
  - Refresh page and try again
  - Check browser console for errors

- **"Contract address not set"**
  - Verify `.env.local` has contract addresses
  - Restart dev server after updating `.env.local`

### Can't Interact with Contracts

- **"Token not supported"**
  - Add token to contract using Hardhat console (see Step 3.5)
  - Set token price in contract

- **"Insufficient allowance"**
  - Approve token spending first
  - Check you have enough token balance

## Testing Checklist

- [ ] Contracts deployed to Sepolia
- [ ] Contract addresses in backend and frontend .env files
- [ ] Backend running on port 3001
- [ ] Frontend running on port 3000
- [ ] Wallet connected to Sepolia
- [ ] User registered
- [ ] Token approved for spending
- [ ] Collateral locked successfully
- [ ] Position visible in dashboard
- [ ] Interest payment recorded
- [ ] Collateral withdrawal works

## Next Steps

1. **Add Test Tokens**: Deploy or get test ERC20 tokens on Sepolia
2. **Test All Features**: Try all user flows
3. **Check Backend Logs**: Monitor API requests
4. **Inspect Transactions**: View on Sepolia Etherscan
5. **Test Edge Cases**: Try invalid inputs, insufficient funds, etc.

## Useful Commands

```bash
# Run contract tests
cd contracts && npm test

# Check contract on Etherscan
# Visit: https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS

# View backend logs
cd backend && npm run dev

# View frontend logs
cd frontend && npm run dev

# Reset MongoDB (if needed)
mongosh
use collateral-crypto
db.dropDatabase()
```

## Support

If you encounter issues:
1. Check all environment variables are set correctly
2. Verify contracts are deployed and addresses match
3. Ensure all services are running (MongoDB, backend, frontend)
4. Check browser console and terminal logs for errors
5. Verify you're on Sepolia testnet in MetaMask
