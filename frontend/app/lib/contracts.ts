// Contract interaction utilities using viem
import { createPublicClient, http } from 'viem';
import { sepolia, mainnet } from 'viem/chains';
import { createWalletClient, custom } from 'viem';

// ABIs live in frontend (no @contracts import = faster dev, no server crashes)
import CollateralLockArtifact from './abis/CollateralLock.json';
import VerificationNFTArtifact from './abis/VerificationNFT.json';
import LoanSecuritizationArtifact from './abis/LoanSecuritization.json';

// Max gas per tx (chain cap often 16_777_216; viem default 21M can revert)
export const MAX_GAS_LIMIT = 16_000_000n;

// Wait longer for receipt (RPC can lag; avoid "receipt could not be found")
export const WAIT_RECEIPT_OPTIONS = {
  timeout: 120_000,
  retryCount: 30,
  retryDelay: 2_000,
} as const;

// Contract addresses - update .env after deployment
export const CONTRACT_ADDRESSES = {
  COLLATERAL_LOCK: process.env.NEXT_PUBLIC_COLLATERAL_LOCK_ADDRESS || '',
  VERIFICATION_NFT: process.env.NEXT_PUBLIC_VERIFICATION_NFT_ADDRESS || '',
  LOAN_SECURITIZATION: process.env.NEXT_PUBLIC_LOAN_SECURITIZATION_ADDRESS || '',
} as const;

// Use full ABIs from Hardhat artifacts (auto-updated on compile)
export const COLLATERAL_LOCK_ABI = CollateralLockArtifact.abi;
export const VERIFICATION_NFT_ABI = VerificationNFTArtifact.abi;
export const LOAN_SECURITIZATION_ABI = LoanSecuritizationArtifact.abi;

// ERC20 ABI for token approvals (standard interface, rarely changes)
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
 * Get viem chain for a given chain ID.
 * Wagmi useChainId() can return -1 when disconnected; never pass that to viem.
 */
export function getChain(chainId: number | undefined) {
  if (typeof chainId !== 'number' || chainId < 0) return sepolia;
  return chainId === 1 ? mainnet : sepolia;
}

/**
 * Get public client for read operations
 */
export function getPublicClient(chainId: number | undefined) {
  return createPublicClient({
    chain: getChain(chainId),
    transport: http(),
  });
}

/**
 * Get wallet client for write operations
 */
export function getWalletClient() {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('Wallet not connected');
  }
  return createWalletClient({
    transport: custom((window as any).ethereum),
  });
}
