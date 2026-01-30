// Main application dashboard - user's entry point after connecting wallet
'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Dashboard } from '../components/Dashboard';
import { WalletConnectPrompt } from '../components/WalletConnectPrompt';

export default function AppPage() {
  const { isConnected, address } = useAccount();
  const [mounted, setMounted] = useState(false);

  // Defer wallet-dependent UI until after client mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Same shell on server and first client render so HTML matches
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg px-4">
        <div className="max-w-md w-full text-center text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return <WalletConnectPrompt />;
  }

  return <Dashboard userAddress={address!} />;
}
