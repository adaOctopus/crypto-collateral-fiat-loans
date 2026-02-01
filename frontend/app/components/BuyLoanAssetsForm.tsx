'use client';

// Buy Loan Fractions: list securitized loans with ticker and loan info, buy one fraction (fixed price)
import { useState, useEffect } from 'react';
import { useChainId } from 'wagmi';
import { parseEther } from 'viem';
import { Button } from './Button';
import { getWalletClient, getPublicClient, getChain, LOAN_SECURITIZATION_ABI, CONTRACT_ADDRESSES, MAX_GAS_LIMIT, WAIT_RECEIPT_OPTIONS } from '../lib/contracts';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const PRICE = parseEther('0.0000001');

/** Display ticker for a loan (exchange-style, e.g. CLOAN-WETH-001) */
function loanTicker(loanId: number): string {
  return `CLOAN-WETH-${String(loanId).padStart(3, '0')}`;
}

/** Plausible display info per loan (static/fake for exchange-style UI) */
const LOAN_DISPLAY = {
  apr: '12% APR',
  term: '12 mo',
  fractions: '10 fractions',
  type: 'Collateral-backed',
} as const;

interface SecuritizedLoanRow {
  _id: string;
  loanId: number;
  userId: string;
  verificationTokenId: number;
  contractAddress: string;
}

export function BuyLoanAssetsForm() {
  const [loans, setLoans] = useState<SecuritizedLoanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const chainId = useChainId();

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get<{ loans: SecuritizedLoanRow[] }>(`${API_URL}/securitized-loans`);
        setLoans(res.data.loans || []);
      } catch {
        setLoans([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const buyFraction = async (loanId: number) => {
    if (loanId < 0) return;
    setError(null);
    setSuccessMessage(null);
    setBuying(loanId);
    try {
      const walletClient = getWalletClient();
      const publicClient = getPublicClient(chainId);
      const [account] = await walletClient.getAddresses();
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.LOAN_SECURITIZATION as `0x${string}`,
        abi: LOAN_SECURITIZATION_ABI,
        functionName: 'buyFraction',
        args: [BigInt(loanId)],
        account,
        chain: getChain(chainId),
        value: PRICE,
        gas: MAX_GAS_LIMIT,
      });
      await publicClient.waitForTransactionReceipt({ hash, ...WAIT_RECEIPT_OPTIONS });
      setSuccessMessage('Fraction purchased successfully.');
    } catch (err: unknown) {
      setSuccessMessage(null);
      setError((err as Error).message || 'Buy failed');
    } finally {
      setBuying(null);
    }
  };

  if (loading) {
    return <p className="text-gray-500 dark:text-gray-400">Loading loans...</p>;
  }
  if (loans.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400">
        No securitized loans yet. Lock collateral to create one.
      </p>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-hover p-4 sm:p-6 max-w-2xl">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Buy Loan Fractions</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        0.0000001 ETH per fraction. Holders receive interest share (ONLY ON PRODUCTION).
      </p>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        Available loans
      </p>
      {successMessage && (
        <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800 text-green-800 dark:text-green-200 rounded-lg mb-4 text-sm">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}
      <ul className="space-y-3">
        {loans.map((loan) => (
          <li
            key={loan._id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-dark-hover bg-gray-50/50 dark:bg-gray-800/30 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 dark:text-white font-mono">
                  {loanTicker(loan.loanId)}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {LOAN_DISPLAY.type}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                <span>{LOAN_DISPLAY.apr}</span>
                <span>{LOAN_DISPLAY.term}</span>
                <span>{LOAN_DISPLAY.fractions}</span>
              </div>
            </div>
            <Button
              onClick={() => buyFraction(loan.loanId)}
              disabled={!!buying}
              className="text-sm shrink-0 w-full sm:w-auto"
            >
              {buying === loan.loanId ? 'Buying...' : 'Buy 1 fraction'}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
