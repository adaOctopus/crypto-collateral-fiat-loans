'use client';

// Form component for locking collateral and creating a loan position
import { useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { Button } from './Button';
import { getWalletClient, getPublicClient, getChain, COLLATERAL_LOCK_ABI, LOAN_SECURITIZATION_ABI, ERC20_ABI, CONTRACT_ADDRESSES } from '../lib/contracts';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Common token addresses (update for your network)
const SUPPORTED_TOKENS = {
  sepolia: {
    '0x...': 'USDC', // Add actual testnet token addresses
  },
  mainnet: {
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 'USDC',
    '0xdAC17F958D2ee523a2206206994597C13D831ec7': 'USDT',
  },
};

export function LockCollateralForm({
  userAddress,
  onSuccess,
}: {
  userAddress: string;
  onSuccess: () => void;
}) {
  const [tokenAddress, setTokenAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chainId = useChainId();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Approve token spending
      const walletClient = getWalletClient();
      const publicClient = getPublicClient(chainId);
      const [account] = await walletClient.getAddresses();
      
      const approveHash = await walletClient.writeContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.COLLATERAL_LOCK as `0x${string}`, parseEther(amount)],
        account,
        chain: getChain(chainId),
      });

      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // 2. Lock collateral
      const minCollateralRatio = parseEther('12000'); // 120%
      const loanAmountWei = parseEther(loanAmount);
      
      const lockHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.COLLATERAL_LOCK as `0x${string}`,
        abi: COLLATERAL_LOCK_ABI,
        functionName: 'lockCollateral',
        args: [
          tokenAddress as `0x${string}`,
          parseEther(amount),
          loanAmountWei,
          minCollateralRatio,
        ],
        account,
        chain: getChain(chainId),
      });

      await publicClient.waitForTransactionReceipt({ hash: lockHash });
      
      // 3. Get position ID from events (simplified - in production parse events)
      // For now, we'll call the contract to get the latest position
      const positions = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.COLLATERAL_LOCK as `0x${string}`,
        abi: COLLATERAL_LOCK_ABI,
        functionName: 'getUserPositions',
        args: [account],
      }) as readonly unknown[];

      const positionId = positions.length - 1;

      // 4. Get position to read nftTokenId
      const position = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.COLLATERAL_LOCK as `0x${string}`,
        abi: COLLATERAL_LOCK_ABI,
        functionName: 'getPosition',
        args: [BigInt(positionId)],
      }) as { nftTokenId: bigint; [k: string]: unknown };
      const nftTokenId = Number(position.nftTokenId ?? 0);

      // 5. Securitize: mint loan + 10 fractions (user owns Verification NFT)
      const loanSecAddr = CONTRACT_ADDRESSES.LOAN_SECURITIZATION as `0x${string}`;
      if (loanSecAddr) {
        const securitizeHash = await walletClient.writeContract({
          address: loanSecAddr,
          abi: LOAN_SECURITIZATION_ABI,
          functionName: 'securitize',
          args: [BigInt(nftTokenId)],
          account,
          chain: getChain(chainId),
        });
        await publicClient.waitForTransactionReceipt({ hash: securitizeHash });
        // In LoanSecuritization, loanId === verificationTokenId (nftTokenId); no separate counter
        await axios.post(`${API_URL}/securitized-loans`, {
          loanId: nftTokenId,
          userId: userAddress.toLowerCase(),
          verificationTokenId: nftTokenId,
          positionId,
          contractAddress: CONTRACT_ADDRESSES.LOAN_SECURITIZATION,
        });
      }

      // 6. Register position in backend
      await axios.post(`${API_URL}/positions`, {
        userId: userAddress.toLowerCase(),
        positionId,
        contractAddress: CONTRACT_ADDRESSES.COLLATERAL_LOCK,
        tokenAddress: tokenAddress.toLowerCase(),
        tokenSymbol: (SUPPORTED_TOKENS[chainId === 1 ? 'mainnet' : 'sepolia'] as Record<string, string>)[tokenAddress] || 'TOKEN',
        amount: parseEther(amount).toString(),
        loanAmountUSD: loanAmountWei.toString(),
        collateralRatio: 15000,
        nftTokenId,
        lockTimestamp: new Date(),
        isActive: true,
      });

      onSuccess();
      setAmount('');
      setLoanAmount('');
      setTokenAddress('');
    } catch (err: any) {
      setError(err.message || 'Failed to lock collateral');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-hover p-4 sm:p-6 max-w-2xl">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-white">
        Lock Collateral
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Token Address
          </label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="0x..."
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-hover rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Collateral Amount
          </label>
          <input
            type="number"
            step="0.000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-hover rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Loan Amount (USD)
          </label>
          <input
            type="number"
            step="0.01"
            value={loanAmount}
            onChange={(e) => setLoanAmount(e.target.value)}
            placeholder="0.00"
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-hover rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Processing...' : 'Lock Collateral'}
        </Button>
      </form>
    </div>
  );
}
