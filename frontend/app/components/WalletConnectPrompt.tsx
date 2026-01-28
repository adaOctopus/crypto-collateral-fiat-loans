'use client';

// Prompt component for users to connect their wallet
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Button } from './Button';
import { WalletModal } from './WalletModal';

export function WalletConnectPrompt() {
  const { isConnected } = useAccount();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  if (isConnected) {
    return null;
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-xl p-6 sm:p-8 border border-gray-200 dark:border-dark-hover">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Connect Your Wallet
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Please connect your Web3 wallet to access the CollateralFusion platform.
            </p>
            <div className="flex justify-center">
              <Button onClick={() => setIsWalletModalOpen(true)}>
                Connect Wallet
              </Button>
            </div>
          </div>
        </div>
      </div>
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </>
  );
}
