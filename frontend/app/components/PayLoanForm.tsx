'use client';

// Form for sending a loan (interest) payment to the bank (fake money). Validates amount against next due for the selected position.
import { useState, useEffect } from 'react';
import { Button } from './Button';
import axios from 'axios';
import { Position } from '../lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface NextUnpaid {
  amount: number;
  amountRaw: string;
  dueDate: string;
}

export function PayLoanForm({
  positions,
  userAddress,
  onSuccess,
}: {
  positions: Position[];
  userAddress: string;
  onSuccess: () => void;
}) {
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [nextUnpaid, setNextUnpaid] = useState<NextUnpaid | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activePositions = positions.filter((p) => p.isActive);

  useEffect(() => {
    if (selectedPosition === null) {
      setNextUnpaid(null);
      setAmount('');
      return;
    }
    setNextUnpaid(null);
    axios
      .get(`${API_URL}/payments/next-unpaid`, {
        params: { walletAddress: userAddress, positionId: selectedPosition },
      })
      .then((res) => setNextUnpaid(res.data))
      .catch(() => setNextUnpaid(null));
  }, [userAddress, selectedPosition]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPosition === null) return;

    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        setError('Enter a valid amount.');
        setLoading(false);
        return;
      }
      if (nextUnpaid != null && Math.abs(amountNum - nextUnpaid.amount) > 1e-10) {
        setError(`Amount must match next payment due ($${nextUnpaid.amount.toFixed(6)}).`);
        setLoading(false);
        return;
      }

      await axios.post(`${API_URL}/payments/record`, {
        walletAddress: userAddress,
        positionId: selectedPosition,
        amount: amountNum,
      });

      setSuccessMessage('Payment recorded successfully.');
      onSuccess();
      setAmount('');
      setSelectedPosition(null);
      setNextUnpaid(null);
    } catch (err: unknown) {
      setSuccessMessage(null);
      const msg = axios.isAxiosError(err) && err.response?.data?.message
        ? err.response.data.message
        : err instanceof Error ? err.message : 'Failed to record payment';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (activePositions.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-hover p-4 sm:p-6">
        <p className="text-gray-600 dark:text-gray-400">
          No active positions. Lock collateral first to have loan payments due.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-hover p-4 sm:p-6 max-w-2xl">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-white">
        Pay Loan (Interest)
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Send your interest payment to the bank. Enter the amount that matches your next due payment for the selected position.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Position
          </label>
          <select
            value={selectedPosition === null ? '' : String(selectedPosition)}
            onChange={(e) => {
              const v = e.target.value;
              setSelectedPosition(v === '' ? null : parseInt(v, 10));
            }}
            required
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-hover rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          >
            <option value="">Choose a position...</option>
            {activePositions.map((position) => (
              <option key={position.positionId} value={String(position.positionId)}>
                Position #{position.positionId} - {position.tokenSymbol} (loan: ${(parseFloat(position.loanAmountUSD) / 1e18).toFixed(6)})
              </option>
            ))}
          </select>
        </div>

        {selectedPosition != null && (
          <>
            {nextUnpaid != null ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Next payment due: <strong>${nextUnpaid.amount.toFixed(6)}</strong>
              </p>
            ) : (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                No unpaid payment for this position.
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount (USD)
              </label>
              <input
                type="number"
                step="0.000001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={nextUnpaid != null ? nextUnpaid.amount.toFixed(6) : '0.0'}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-hover rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            </div>
          </>
        )}

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

        <Button
          type="submit"
          disabled={loading || selectedPosition === null || (selectedPosition != null && nextUnpaid === null)}
          className="w-full"
        >
          {loading ? 'Processing...' : 'Send Payment'}
        </Button>
      </form>
    </div>
  );
}
