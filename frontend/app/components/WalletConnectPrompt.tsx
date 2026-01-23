'use client';

// Prompt component for users to connect their wallet
import { useConnect, useAccount } from 'wagmi';
import { Button } from './Button';

export function WalletConnectPrompt() {
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();

  if (isConnected) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full mx-4 text-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
            Connect Your Wallet
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Please connect your Web3 wallet to access the Collateral Crypto platform.
          </p>
          <div className="flex justify-center">
            <Button onClick={() => connect({ connector: connectors[0] })}>
              Connect Wallet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
