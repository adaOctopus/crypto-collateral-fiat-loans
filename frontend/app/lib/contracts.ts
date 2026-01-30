// Contract interaction utilities using viem
import { createPublicClient, http } from 'viem';
import { sepolia, mainnet } from 'viem/chains';
import { createWalletClient, custom } from 'viem';

// Import ABIs from Hardhat artifacts - always use latest after compile
import CollateralLockArtifact from '@contracts/artifacts/contracts/CollateralLock.sol/CollateralLock.json';
import VerificationNFTArtifact from '@contracts/artifacts/contracts/VerificationNFT.sol/VerificationNFT.json';
import LoanSecuritizationArtifact from '@contracts/artifacts/contracts/LoanSecuritization.sol/LoanSecuritization.json';

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
 * Get viem chain for a given chain ID
 */
export function getChain(chainId: number) {
  return chainId === 1 ? mainnet : sepolia;
}

/**
 * Get public client for read operations
 */
export function getPublicClient(chainId: number) {
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
