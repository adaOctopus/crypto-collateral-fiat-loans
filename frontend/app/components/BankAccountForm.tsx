'use client';

// Form component for updating bank account information
import { useState, useEffect } from 'react';
import { Button } from './Button';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function BankAccountForm({ userAddress }: { userAddress: string }) {
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Fetch existing bank account info
    axios
      .get(`${API_URL}/users/${userAddress}`)
      .then((response) => {
        const info = response.data.user?.bankAccountInfo;
        if (info) {
          setAccountNumber(info.accountNumber || '');
          setRoutingNumber(info.routingNumber || '');
          setBankName(info.bankName || '');
        }
      })
      .catch(() => {
        // User might not exist yet, that's okay
      });
  }, [userAddress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      await axios.put(`${API_URL}/users/${userAddress}/bank-account`, {
        bankAccountInfo: {
          accountNumber,
          routingNumber,
          bankName,
        },
      });
      setSuccess(true);
    } catch (error: any) {
      console.error('Failed to update bank account:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-hover p-4 sm:p-6 max-w-2xl">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-white">
        Bank Account Information
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
        Provide your bank account details to receive fiat currency loans.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bank Name
          </label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="Your Bank Name"
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-hover rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Account Number
          </label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="1234567890"
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-hover rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Routing Number
          </label>
          <input
            type="text"
            value={routingNumber}
            onChange={(e) => setRoutingNumber(e.target.value)}
            placeholder="123456789"
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-hover rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
          />
        </div>

        {success && (
          <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800 text-green-800 dark:text-green-200 rounded-lg">
            Bank account information updated successfully!
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Saving...' : 'Save Bank Account Info'}
        </Button>
      </form>
    </div>
  );
}
