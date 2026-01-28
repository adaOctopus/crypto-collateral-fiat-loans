# Frontend Contract Integration Guide

## Overview

The frontend interacts with smart contracts using **viem** (modern alternative to ethers.js) and **wagmi** for wallet connection management.

## Implementation Location

### Contract Interaction Layer
- **File**: `app/lib/contracts.ts`
- **Purpose**: Contract ABIs (from Hardhat artifacts), addresses, and utility functions for reading/writing to contracts
- **ABIs**: `COLLATERAL_LOCK_ABI` and `VERIFICATION_NFT_ABI` are **imported from `contracts/artifacts/`** (Hardhat compile output). The frontend automatically uses the latest ABIs—no manual copy-paste. Run `npx hardhat compile` in `contracts/` after changing contracts, then restart or rebuild the frontend.
- **Key Functions**:
  - `getPublicClient(chainId)` - For read operations and `waitForTransactionReceipt`
  - `getWalletClient()` - For write operations (requires wallet connection)
  - `getChain(chainId)` - Returns viem chain (Sepolia/Mainnet) for `writeContract`

### Contract Addresses
Contract addresses are stored in environment variables:
- `NEXT_PUBLIC_COLLATERAL_LOCK_ADDRESS` - Main collateral lock contract
- `NEXT_PUBLIC_VERIFICATION_NFT_ADDRESS` - NFT verification contract

Update these in `.env.local` after deploying contracts.

## Wallet Integration

### Wagmi Configuration
- **File**: `app/providers.tsx`
- **Setup**: Configures Wagmi with WalletConnect and injected wallet connectors
- **Chains**: Supports Sepolia (testnet) and Mainnet

### Wallet Connection
- Uses `@rainbow-me/rainbowkit` for beautiful wallet connection UI
- Automatically handles chain switching and account changes
- Access wallet state via `useAccount()` hook

## Key Integration Points

### 1. Locking Collateral
**Component**: `app/components/LockCollateralForm.tsx`

**Flow**:
1. User enters token address, amount, and loan amount
2. Approve ERC20 token spending
3. Call `lockCollateral()` on contract
4. Register position in backend via API

**Code Pattern**:
```typescript
// Approve
await walletClient.writeContract({
  address: tokenAddress,
  abi: ERC20_ABI,
  functionName: 'approve',
  args: [contractAddress, amount],
});

// Lock
await walletClient.writeContract({
  address: CONTRACT_ADDRESSES.COLLATERAL_LOCK,
  abi: COLLATERAL_LOCK_ABI,
  functionName: 'lockCollateral',
  args: [tokenAddress, amount, loanAmount, minRatio],
});
```

### 2. Unlocking Collateral
**Component**: `app/components/WithdrawForm.tsx`

**Flow**:
1. Check eligibility via backend API
2. Call `unlockCollateral()` on contract
3. Refresh positions list

### 3. Reading Position Data
**Component**: `app/components/PositionsList.tsx`

**Flow**:
- Positions are fetched from backend API (which syncs with contract)
- For real-time on-chain data, use `getUserPositions()` from contract

## Error Handling

All contract interactions include try-catch blocks with user-friendly error messages. Common errors:
- Insufficient token balance
- Insufficient allowance
- Position not healthy
- Transaction rejected by user

## Best Practices

1. **Always check wallet connection** before contract calls
2. **Show loading states** during transactions
3. **Wait for transaction receipts** before updating UI
4. **Sync with backend** after on-chain operations
5. **Handle network switching** gracefully

## Testing

For local testing:
1. Deploy contracts to local Hardhat node
2. Update contract addresses in `.env.local`
3. Connect MetaMask to local network (chainId: 31337)
4. Import test accounts with test ETH
