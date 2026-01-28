'use client';

// Main dashboard component showing user's positions, collateral ratios, and payment status
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Navbar } from './Navbar';
import { PositionsList } from './PositionsList';
import { LockCollateralForm } from './LockCollateralForm';
import { BankAccountForm } from './BankAccountForm';
import { WithdrawForm } from './WithdrawForm';
import { useTheme } from './ThemeProvider';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Position {
  _id: string;
  positionId: number;
  tokenSymbol: string;
  amount: string;
  loanAmountUSD: string;
  collateralRatio: number;
  isActive: boolean;
  paymentStats: {
    total: number;
    paid: number;
    unpaid: number;
    late: number;
  };
}

export function Dashboard({ userAddress }: { userAddress: string }) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'positions' | 'lock' | 'withdraw' | 'bank'>('positions');
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    fetchPositions();
  }, [userAddress]);

  const fetchPositions = async () => {
    try {
      const response = await axios.get(`${API_URL}/positions/user/${userAddress}`);
      setPositions(response.data.positions || []);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Manage your collateral positions and loans
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-dark-card overflow-x-auto">
          {[
            { id: 'positions', label: 'My Positions' },
            { id: 'lock', label: 'Lock Collateral' },
            { id: 'withdraw', label: 'Withdraw' },
            { id: 'bank', label: 'Bank Account' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 sm:px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-b-2 border-primary-500 text-primary-500 dark:text-primary-500'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'positions' && (
          <PositionsList
            positions={positions}
            loading={loading}
            onRefresh={fetchPositions}
          />
        )}

        {activeTab === 'lock' && (
          <LockCollateralForm
            userAddress={userAddress}
            onSuccess={fetchPositions}
          />
        )}

        {activeTab === 'withdraw' && (
          <WithdrawForm
            positions={positions}
            userAddress={userAddress}
            onSuccess={fetchPositions}
          />
        )}

        {activeTab === 'bank' && (
          <BankAccountForm userAddress={userAddress} />
        )}
      </div>
    </div>
  );
}
