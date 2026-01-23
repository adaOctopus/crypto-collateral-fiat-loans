// Contract interaction utilities using viem
import { createPublicClient, http, parseEther, formatEther } from 'viem';
import { sepolia, mainnet } from 'viem/chains';
import { createWalletClient, custom } from 'viem';

// Contract addresses - update these after deployment
export const CONTRACT_ADDRESSES = {
  COLLATERAL_LOCK: process.env.NEXT_PUBLIC_COLLATERAL_LOCK_ADDRESS || '',
  VERIFICATION_NFT: process.env.NEXT_PUBLIC_VERIFICATION_NFT_ADDRESS || '',
} as const;

// Simplified ABI for CollateralLock (minimal interface)
export const COLLATERAL_LOCK_ABI = [
  {
    inputs: [
      { name: 'tokenAddress', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'loanAmountUSD', type: 'uint256' },
      { name: 'minCollateralRatio', type: 'uint256' },
    ],
    name: 'lockCollateral',
    outputs: [{ name: 'positionId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'positionId', type: 'uint256' },
      { name: 'unlockAmount', type: 'uint256' },
    ],
    name: 'unlockCollateral',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserPositions',
    outputs: [
      {
        components: [
          { name: 'user', type: 'address' },
          { name: 'tokenAddress', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'loanAmount', type: 'uint256' },
          { name: 'collateralRatio', type: 'uint256' },
          { name: 'lockTimestamp', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
          { name: 'nftTokenId', type: 'uint256' },
        ],
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'positionId', type: 'uint256' }],
    name: 'getPosition',
    outputs: [
      {
        components: [
          { name: 'user', type: 'address' },
          { name: 'tokenAddress', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'loanAmount', type: 'uint256' },
          { name: 'collateralRatio', type: 'uint256' },
          { name: 'lockTimestamp', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
          { name: 'nftTokenId', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ERC20 ABI for token approvals
export const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Get public client for read operations
 */
export function getPublicClient(chainId: number) {
  const chain = chainId === 1 ? mainnet : sepolia;
  return createPublicClient({
    chain,
    transport: http(),
  });
}

/**
 * Get wallet client for write operations
 */
export function getWalletClient() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Wallet not connected');
  }
  
  return createWalletClient({
    transport: custom(window.ethereum),
  });
}
