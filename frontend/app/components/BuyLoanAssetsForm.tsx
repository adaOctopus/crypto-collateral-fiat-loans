'use client';

// Minimal form: list securitized loans and buy one fraction (fixed price)
import { useState, useEffect } from 'react';
import { useChainId } from 'wagmi';
import { parseEther } from 'viem';
import { Button } from './Button';
import { getWalletClient, getPublicClient, getChain, LOAN_SECURITIZATION_ABI, CONTRACT_ADDRESSES, MAX_GAS_LIMIT, WAIT_RECEIPT_OPTIONS } from '../lib/contracts';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const PRICE = parseEther('0.0000001');

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
        0.0000001 ETH per fraction. Holders receive interest share (dummy for now).
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
      <ul className="space-y-2">
        {loans.map((loan) => (
          <li
            key={loan._id}
            className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-dark-hover last:border-0"
          >
            <span className="text-gray-900 dark:text-white">Loan #{loan.loanId}</span>
            <Button
              onClick={() => buyFraction(loan.loanId)}
              disabled={!!buying}
              className="text-sm"
            >
              {buying === loan.loanId ? 'Buying...' : 'Buy 1 fraction'}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
