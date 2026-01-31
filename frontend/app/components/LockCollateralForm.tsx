'use client';

// Form component for locking collateral and creating a loan position
import { useState } from 'react';
import { useChainId } from 'wagmi';
import { parseEther } from 'viem';
import { Button } from './Button';
import { getWalletClient, getPublicClient, getChain, COLLATERAL_LOCK_ABI, LOAN_SECURITIZATION_ABI, ERC20_ABI, CONTRACT_ADDRESSES, MAX_GAS_LIMIT } from '../lib/contracts';
import { getTokenAddress, getTokenSymbol, PRESET_TOKENS } from '../lib/supportedTokens';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const CUSTOM_VALUE = 'CUSTOM';

export function LockCollateralForm({
  userAddress,
  onSuccess,
}: {
  userAddress: string;
  onSuccess: () => void;
}) {
  const [tokenPreset, setTokenPreset] = useState<string>('WETH');
  const [customTokenAddress, setCustomTokenAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chainId = useChainId();

  const tokenAddress =
    tokenPreset === CUSTOM_VALUE ? customTokenAddress : getTokenAddress(tokenPreset, chainId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!tokenAddress?.trim()) {
      setError('Select a token or enter a custom contract address.');
      return;
    }
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
        gas: MAX_GAS_LIMIT,
      });

      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // 2. Lock collateral (minCollateralRatio = 12000 = 120% in basis points, not wei)
      const loanAmountWei = parseEther(loanAmount);
      const minCollateralRatioBps = 12000n;

      const lockHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.COLLATERAL_LOCK as `0x${string}`,
        abi: COLLATERAL_LOCK_ABI,
        functionName: 'lockCollateral',
        args: [
          tokenAddress as `0x${string}`,
          parseEther(amount),
          loanAmountWei,
          minCollateralRatioBps,
        ],
        account,
        chain: getChain(chainId),
        gas: MAX_GAS_LIMIT,
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

      if (!positions?.length) {
        throw new Error('No positions found after lock. Please refresh and try again.');
      }
      const positionId = positions.length - 1;
      if (positionId < 0) {
        throw new Error('Invalid position. Please try again.');
      }

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
          gas: MAX_GAS_LIMIT,
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
        tokenSymbol: getTokenSymbol(tokenAddress, chainId),
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
      setTokenPreset('WETH');
      setCustomTokenAddress('');
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
            Collateral Token
          </label>
          <select
            value={tokenPreset}
            onChange={(e) => setTokenPreset(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-hover rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          >
            {PRESET_TOKENS.map((t) => (
              <option key={t.key} value={t.value}>
                {t.label}
              </option>
            ))}
            <option value={CUSTOM_VALUE}>Custom address</option>
          </select>
          {tokenPreset === CUSTOM_VALUE && (
            <input
              type="text"
              value={customTokenAddress}
              onChange={(e) => setCustomTokenAddress(e.target.value)}
              placeholder="0x..."
              className="mt-2 w-full px-4 py-2 border border-gray-300 dark:border-dark-hover rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          )}
          {tokenPreset === 'WETH' && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Wrapped ETH — wrap native ETH on Sepolia to use as collateral for the demo.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Collateral Amount {tokenPreset !== CUSTOM_VALUE && `(${tokenPreset})`}
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
