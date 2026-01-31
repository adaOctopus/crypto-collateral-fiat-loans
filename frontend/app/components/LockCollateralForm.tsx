'use client';

// Form component for locking collateral and creating a loan position
import { useState } from 'react';
import { useChainId } from 'wagmi';
import { parseEther, decodeEventLog } from 'viem';
import { Button } from './Button';
import { getWalletClient, getPublicClient, getChain, COLLATERAL_LOCK_ABI, LOAN_SECURITIZATION_ABI, ERC20_ABI, CONTRACT_ADDRESSES, MAX_GAS_LIMIT, WAIT_RECEIPT_OPTIONS } from '../lib/contracts';
import { getTokenAddress, getTokenSymbol, PRESET_TOKENS } from '../lib/supportedTokens';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const CUSTOM_VALUE = 'CUSTOM';

/** Step labels shown during lock flow to keep users engaged */
const LOCK_STEPS = [
  'Approving token…',
  'Locking collateral…',
  'Confirming on chain…',
  'Minting loan…',
  'Saving position…',
] as const;

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
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const chainId = useChainId();

  const tokenAddress =
    tokenPreset === CUSTOM_VALUE ? customTokenAddress : getTokenAddress(tokenPreset, chainId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    if (!tokenAddress?.trim()) {
      setError('Select a token or enter a custom contract address.');
      return;
    }
    setLoading(true);
    setStepIndex(0);

    try {
      const walletClient = getWalletClient();
      const publicClient = getPublicClient(chainId);
      const [account] = await walletClient.getAddresses();
      const collateralLockAddr = CONTRACT_ADDRESSES.COLLATERAL_LOCK as `0x${string}`;

      // 1. Approve token spending
      setStepIndex(0);
      const approveHash = await walletClient.writeContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [collateralLockAddr, parseEther(amount)],
        account,
        chain: getChain(chainId),
        gas: MAX_GAS_LIMIT,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash, ...WAIT_RECEIPT_OPTIONS });

      // 2. Lock collateral
      setStepIndex(1);
      const loanAmountWei = parseEther(loanAmount);
      const minCollateralRatioBps = 12000n;
      const lockHash = await walletClient.writeContract({
        address: collateralLockAddr,
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

      // 3. Get positionId and nftTokenId from tx receipt (no RPC lag)
      setStepIndex(2);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: lockHash, ...WAIT_RECEIPT_OPTIONS });
      const contractLogs = receipt.logs.filter(
        (log) => log.address?.toLowerCase() === collateralLockAddr.toLowerCase()
      );
      let positionId: number | null = null;
      let nftTokenId: number | null = null;
      for (const log of contractLogs) {
        try {
          const decoded = decodeEventLog({
            abi: COLLATERAL_LOCK_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === 'CollateralLocked') {
            const args = decoded.args as unknown as { positionId: bigint; nftTokenId: bigint };
            positionId = Number(args.positionId);
            nftTokenId = Number(args.nftTokenId);
            break;
          }
        } catch {
          continue;
        }
      }
      if (positionId === null || nftTokenId === null) {
        throw new Error('Could not read position from transaction. Please try again or refresh.');
      }

      // 4. Securitize: mint loan + fractions (user owns Verification NFT)
      const loanSecAddr = CONTRACT_ADDRESSES.LOAN_SECURITIZATION as `0x${string}`;
      if (loanSecAddr) {
        setStepIndex(3);
        const securitizeHash = await walletClient.writeContract({
          address: loanSecAddr,
          abi: LOAN_SECURITIZATION_ABI,
          functionName: 'securitize',
          args: [BigInt(nftTokenId)],
          account,
          chain: getChain(chainId),
          gas: MAX_GAS_LIMIT,
        });
        await publicClient.waitForTransactionReceipt({ hash: securitizeHash, ...WAIT_RECEIPT_OPTIONS });
        await axios.post(`${API_URL}/securitized-loans`, {
          loanId: nftTokenId,
          userId: userAddress.toLowerCase(),
          verificationTokenId: nftTokenId,
          positionId,
          contractAddress: CONTRACT_ADDRESSES.LOAN_SECURITIZATION,
        });
      }

      // 5. Register position in backend
      setStepIndex(4);
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

      setSuccessMessage('Collateral locked successfully. Position and securitized loan recorded.');
      onSuccess();
      setAmount('');
      setLoanAmount('');
      setTokenPreset('WETH');
      setCustomTokenAddress('');
    } catch (err: any) {
      setSuccessMessage(null);
      const msg = err?.message ?? err?.shortMessage ?? 'Failed to lock collateral';
      const isTokenNotSupported =
        typeof msg === 'string' &&
        (msg.toLowerCase().includes('token not supported') || msg.toLowerCase().includes('onlysupportedtoken'));
      setError(
        isTokenNotSupported
          ? 'This token is not enabled on the contract. The deployer must run: npx hardhat run scripts/enable-weth.ts --network sepolia'
          : msg
      );
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
              Wrapped ETH — wrap native ETH on Sepolia to use as collateral. The contract owner must enable WETH (see README: enable-weth script) if you see &quot;Token not supported&quot;.
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

        {successMessage && (
          <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800 text-green-800 dark:text-green-200 rounded-lg">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 min-h-[44px]">
          {loading ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
              <span>{LOCK_STEPS[stepIndex] ?? 'Please wait…'}</span>
            </>
          ) : (
            'Lock Collateral'
          )}
        </Button>
      </form>
    </div>
  );
}
