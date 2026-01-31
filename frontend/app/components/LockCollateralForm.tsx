'use client';

// Form component for locking collateral and creating a loan position
import { useState } from 'react';
import { useChainId } from 'wagmi';
import { parseEther, decodeEventLog, decodeErrorResult, encodeFunctionData } from 'viem';
import { Button } from './Button';
import { getWalletClient, getPublicClient, getChain, COLLATERAL_LOCK_ABI, LOAN_SECURITIZATION_ABI, ERC20_ABI, CONTRACT_ADDRESSES, MAX_GAS_LIMIT, WAIT_RECEIPT_OPTIONS } from '../lib/contracts';
import { getTokenAddress, getTokenSymbol, PRESET_TOKENS } from '../lib/supportedTokens';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const CUSTOM_VALUE = 'CUSTOM';

/** Step labels shown during lock flow to keep users engaged */
const LOCK_STEPS = [
  'Approving token…',
  'Checking & locking collateral…',
  'Confirming on chain…',
  'Minting loan…',
  'Saving position…',
] as const;

/** Block explorer tx URL for debugging and user messages */
function getTxUrl(hash: string, chainId: number): string {
  const base = chainId === 1 ? 'https://etherscan.io' : 'https://sepolia.etherscan.io';
  return `${base}/tx/${hash}`;
}

type ClientWithRequest = { request: (args: { method: string; params: unknown[] }) => Promise<unknown> };

/** Recursively dig for a .data hex string in error/cause/error chain (max depth to avoid stack) */
function digForRevertData(obj: unknown, depth: number): string | null {
  if (depth <= 0 || !obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  if (typeof o.data === 'string' && o.data.startsWith('0x') && o.data.length >= 10) return o.data;
  for (const key of ['cause', 'error', 'details', 'raw']) {
    const next = o[key];
    if (next && typeof next === 'object') {
      const found = digForRevertData(next, depth - 1);
      if (found) return found;
    }
  }
  return null;
}

/** Safe peek at error shape for debugging (no circular refs) */
function errorShape(err: unknown): Record<string, unknown> {
  if (!err || typeof err !== 'object') return { _: String(err) };
  const o = err as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(o)) {
    try {
      const v = o[k];
      if (typeof v === 'string') out[k] = v.length > 200 ? v.slice(0, 200) + '...' : v;
      else if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = { _keys: Object.keys(v as object), _sample: (v as Record<string, unknown>).data != null ? String((v as Record<string, unknown>).data).slice(0, 66) : undefined };
      else out[k] = v;
    } catch {
      out[k] = '[?]';
    }
  }
  return out;
}

/** Run eth_call to simulate lockCollateral; on revert, decode RPC error.data and return require() message */
async function getLockRevertReason(
  publicClient: ClientWithRequest,
  contractAddress: `0x${string}`,
  encodedCall: `0x${string}`,
  from: `0x${string}`,
  abi: readonly unknown[]
): Promise<string | null> {
  try {
    await publicClient.request({
      method: 'eth_call',
      params: [{ to: contractAddress, from, data: encodedCall }, 'latest'],
    });
    return null;
  } catch (err: unknown) {
    const o = err && typeof err === 'object' ? (err as Record<string, unknown>) : {};
    let data: string | null = null;
    if (typeof o.data === 'string' && o.data.startsWith('0x')) data = o.data;
    if (!data && o.cause && typeof o.cause === 'object') {
      const c = o.cause as Record<string, unknown>;
      if (typeof c.data === 'string' && c.data.startsWith('0x')) data = c.data;
      if (!data && c.cause && typeof c.cause === 'object') {
        const cc = (c.cause as Record<string, unknown>).data;
        if (typeof cc === 'string' && cc.startsWith('0x')) data = cc;
      }
    }
    if (!data && o.error && typeof o.error === 'object') {
      const e = (o.error as Record<string, unknown>).data;
      if (typeof e === 'string' && e.startsWith('0x')) data = e;
    }
    if (!data) {
      data = digForRevertData(o, 5);
    }
    if (!data || data.length < 10) {
      console.warn('[LockCollateral] getLockRevertReason: no revert data in error. Error shape:', errorShape(err));
      return null;
    }
    try {
      const decoded = decodeErrorResult({ abi, data: data as `0x${string}` });
      const first = (decoded.args as readonly unknown[])?.[0];
      if (typeof first === 'string') return first;
    } catch (decodeErr) {
      console.warn('[LockCollateral] getLockRevertReason: decodeErrorResult failed. data (first 66):', data.slice(0, 66), 'decodeErr:', decodeErr);
    }
    return null;
  }
}

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

    const log = (step: string, data?: unknown) => {
      console.log('[LockCollateral]', step, data !== undefined ? data : '');
    };

    try {
      const walletClient = getWalletClient();
      const publicClient = getPublicClient(chainId);
      const [account] = await walletClient.getAddresses();
      const collateralLockAddr = CONTRACT_ADDRESSES.COLLATERAL_LOCK as `0x${string}`;

      log('start', { account, tokenAddress, amount, loanAmount, chainId });

      const loanAmountWei = parseEther(loanAmount);
      const amountWei = parseEther(amount);
      const minCollateralRatioBps = 12000n;

      // 0. Pre-flight: read contract state so we can show exact error without relying on RPC revert data
      const supported = await publicClient.readContract({
        address: collateralLockAddr,
        abi: COLLATERAL_LOCK_ABI,
        functionName: 'supportedTokens',
        args: [tokenAddress as `0x${string}`],
      });
      if (!supported) {
        throw new Error('Token not supported. Deployer must run: npx hardhat run scripts/enable-weth.ts --network sepolia');
      }
      const priceWei = (await publicClient.readContract({
        address: collateralLockAddr,
        abi: COLLATERAL_LOCK_ABI,
        functionName: 'tokenPrices',
        args: [tokenAddress as `0x${string}`],
      })) as bigint;
      if (priceWei === 0n) {
        throw new Error('Token price not set. Deployer must run: npx hardhat run scripts/enable-weth.ts --network sepolia');
      }
      const collateralValueWei = (amountWei * priceWei) / BigInt(1e18);
      const ratioBps = loanAmountWei === 0n ? 0n : (collateralValueWei * 10000n) / loanAmountWei;
      if (ratioBps < minCollateralRatioBps) {
        const ratioPct = Number(ratioBps) / 100;
        throw new Error(`Insufficient collateral: ratio would be ${ratioPct.toFixed(1)}% (minimum 120%). Lower the loan amount or add more collateral.`);
      }
      const balance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [account],
      });
      if (balance < amountWei) {
        throw new Error(`Insufficient balance: you have ${String(balance)} wei, need ${String(amountWei)}.`);
      }

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
      log('approve tx sent', { hash: approveHash });
      await publicClient.waitForTransactionReceipt({ hash: approveHash, ...WAIT_RECEIPT_OPTIONS });
      log('approve confirmed');

      // 2. eth_call first to get exact revert reason (require("string")) if lock would fail
      setStepIndex(1);
      const lockArgs = [
        tokenAddress as `0x${string}`,
        amountWei,
        loanAmountWei,
        minCollateralRatioBps,
      ] as const;
      const encodedLock = encodeFunctionData({
        abi: COLLATERAL_LOCK_ABI,
        functionName: 'lockCollateral',
        args: lockArgs,
      });
      const revertReason = await getLockRevertReason(
        publicClient as unknown as ClientWithRequest,
        collateralLockAddr,
        encodedLock,
        account,
        COLLATERAL_LOCK_ABI as readonly unknown[]
      );
      if (revertReason) {
        log('lock would revert', { reason: revertReason });
        throw new Error(revertReason);
      }
      log('lock simulation ok');

      // 3. Lock collateral (simulation passed)
      const lockHash = await walletClient.writeContract({
        address: collateralLockAddr,
        abi: COLLATERAL_LOCK_ABI,
        functionName: 'lockCollateral',
        args: lockArgs,
        account,
        chain: getChain(chainId),
        gas: MAX_GAS_LIMIT,
      });
      log('lock tx sent', { hash: lockHash, explorer: getTxUrl(lockHash, chainId) });

      // 4. Get positionId and nftTokenId: from tx receipt event first, then fallback to chain read
      setStepIndex(2);
      let receipt;
      try {
        receipt = await publicClient.waitForTransactionReceipt({ hash: lockHash, ...WAIT_RECEIPT_OPTIONS });
      } catch (receiptErr: unknown) {
        const msg = receiptErr instanceof Error ? receiptErr.message : String(receiptErr);
        const isReceiptNotFound = /could not be found|receipt.*not found/i.test(msg);
        log('waitForTransactionReceipt failed', { error: msg, hash: lockHash });
        if (isReceiptNotFound) {
          const explorerUrl = getTxUrl(lockHash, chainId);
          throw new Error(
            `Transaction was sent but confirmation timed out. Check status: ${explorerUrl} — If it shows "Fail", the contract reverted (e.g. insufficient collateral, token not supported, or token price not set).`
          );
        }
        throw receiptErr;
      }

      log('receipt received', { status: receipt.status, blockNumber: receipt.blockNumber });

      if (receipt.status === 'reverted') {
        const revertMsg = await getLockRevertReason(
          publicClient as unknown as ClientWithRequest,
          collateralLockAddr,
          encodedLock,
          account,
          COLLATERAL_LOCK_ABI as readonly unknown[]
        );
        log('tx reverted', { revertMsg });
        const fallbackMsg =
          'Transaction reverted. Your RPC did not return the revert reason. Common causes: (1) Insufficient collateral — try a lower loan amount or more collateral. (2) Token not supported — deployer must run: npx hardhat run scripts/enable-weth.ts --network sepolia. (3) Token price not set. (4) Transfer failed — check allowance and balance. Use an RPC that returns revert data (e.g. Alchemy) to see the exact reason.';
        throw new Error(revertMsg ?? fallbackMsg);
      }

      let positionId: number | null = null;
      let nftTokenId: number | null = null;
      // Try to read from CollateralLocked event (scan all logs in case address format differs)
      for (const evtLog of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: COLLATERAL_LOCK_ABI,
            data: evtLog.data,
            topics: evtLog.topics,
          });
          if (decoded.eventName === 'CollateralLocked') {
            const args = decoded.args as unknown as { positionId: bigint; nftTokenId: bigint };
            positionId = Number(args.positionId);
            nftTokenId = Number(args.nftTokenId);
            log('position from event', { positionId, nftTokenId });
            break;
          }
        } catch {
          continue;
        }
      }

      // Fallback: read from chain (RPC state may lag, so retry)
      if (positionId === null || nftTokenId === null) {
        const maxAttempts = 10;
        const delayMs = 1500;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const positions = (await publicClient.readContract({
            address: collateralLockAddr,
            abi: COLLATERAL_LOCK_ABI,
            functionName: 'getUserPositions',
            args: [account],
          })) as readonly unknown[];
          if (positions?.length && positions.length > 0) {
            const idx = positions.length - 1;
            const position = await publicClient.readContract({
              address: collateralLockAddr,
              abi: COLLATERAL_LOCK_ABI,
              functionName: 'getPosition',
              args: [BigInt(idx)],
            }) as { nftTokenId: bigint };
            positionId = idx;
            nftTokenId = Number(position.nftTokenId ?? 0);
            log('position from chain fallback', { positionId: idx, nftTokenId });
            break;
          }
          if (attempt < maxAttempts - 1) await new Promise((r) => setTimeout(r, delayMs));
        }
      }

      if (positionId === null || nftTokenId === null) {
        throw new Error('Position not found after lock. Wait a minute and refresh the page; your collateral is safe.');
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
      log('POST positions', { positionId, nftTokenId });
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

      log('success');
      setSuccessMessage('Collateral locked successfully. Position and securitized loan recorded.');
      onSuccess();
      setAmount('');
      setLoanAmount('');
      setTokenPreset('WETH');
      setCustomTokenAddress('');
    } catch (err: any) {
      console.error('[LockCollateral] error', err?.message ?? err?.shortMessage ?? err);
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

  const isSepolia = chainId === 11155111;
  const isMainnet = chainId === 1;

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-hover p-4 sm:p-6 max-w-2xl">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-white">
        Lock Collateral
      </h2>

      {!isSepolia && !isMainnet && (
        <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 rounded-lg text-sm">
          Switch your wallet to <strong>Sepolia</strong> to use this app. The contract is deployed on Sepolia; using another network will cause &quot;Token not supported&quot; or revert.
        </div>
      )}
      {isMainnet && (
        <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 rounded-lg text-sm">
          You are on Mainnet. If your contract was deployed on Sepolia, switch to <strong>Sepolia</strong> in MetaMask or the lock will revert.
        </div>
      )}

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
