'use client';

// Form component for withdrawing portions of locked collateral
import { useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { parseEther } from 'viem';
import { Button } from './Button';
import { getWalletClient, getPublicClient, getChain, COLLATERAL_LOCK_ABI, CONTRACT_ADDRESSES, MAX_GAS_LIMIT } from '../lib/contracts';
import axios from 'axios';
import { Position } from '../lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function WithdrawForm({
  positions,
  userAddress,
  onSuccess,
}: {
  positions: Position[];
  userAddress: string;
  onSuccess: () => void;
}) {
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [unlockAmount, setUnlockAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chainId = useChainId();

  const activePositions = positions.filter((p) => p.isActive);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPosition === null) return;

    setError(null);
    setLoading(true);

    try {
      // Check eligibility with backend
      const eligibilityResponse = await axios.get(`${API_URL}/payments/check-unlock`, {
        params: {
          walletAddress: userAddress,
          positionId: selectedPosition,
          unlockPercentage: (parseFloat(unlockAmount) / parseFloat(activePositions.find(p => p.positionId === selectedPosition)!.amount) * 100).toFixed(2),
        },
      });

      if (!eligibilityResponse.data.canUnlock) {
        setError(eligibilityResponse.data.reason || 'Cannot unlock collateral');
        setLoading(false);
        return;
      }

      // Execute unlock on chain
      const walletClient = getWalletClient();
      const publicClient = getPublicClient(chainId);
      const [account] = await walletClient.getAddresses();

      if (selectedPosition == null || selectedPosition < 0) {
        throw new Error('Please select a position.');
      }
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.COLLATERAL_LOCK as `0x${string}`,
        abi: COLLATERAL_LOCK_ABI,
        functionName: 'unlockCollateral',
        args: [BigInt(selectedPosition), parseEther(unlockAmount)],
        account,
        chain: getChain(chainId),
        gas: MAX_GAS_LIMIT,
      });

      await publicClient.waitForTransactionReceipt({ hash });

      onSuccess();
      setUnlockAmount('');
      setSelectedPosition(null);
    } catch (err: any) {
      setError(err.message || 'Failed to unlock collateral');
    } finally {
      setLoading(false);
    }
  };

  if (activePositions.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-hover p-4 sm:p-6">
        <p className="text-gray-600 dark:text-gray-400">
          No active positions available for withdrawal.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-hover p-4 sm:p-6 max-w-2xl">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-white">
        Withdraw Collateral
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Position
          </label>
          <select
            value={selectedPosition || ''}
            onChange={(e) => setSelectedPosition(parseInt(e.target.value))}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-hover rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          >
            <option value="">Choose a position...</option>
            {activePositions.map((position) => (
              <option key={position.positionId} value={position.positionId}>
                Position #{position.positionId} - {position.tokenSymbol} ({parseFloat(position.amount) / 1e18})
              </option>
            ))}
          </select>
        </div>

        {selectedPosition && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount to Unlock
            </label>
            <input
              type="number"
              step="0.000001"
              value={unlockAmount}
              onChange={(e) => setUnlockAmount(e.target.value)}
              placeholder="0.0"
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-hover rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Maximum 25% of collateral per unlock
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading || !selectedPosition} className="w-full">
          {loading ? 'Processing...' : 'Withdraw Collateral'}
        </Button>
      </form>
    </div>
  );
}
