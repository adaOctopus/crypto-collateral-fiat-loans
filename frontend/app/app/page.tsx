// Main application dashboard - user's entry point after connecting wallet
'use client';

import { useAccount } from 'wagmi';
import { Dashboard } from '../components/Dashboard';
import { WalletConnectPrompt } from '../components/WalletConnectPrompt';

export default function AppPage() {
  const { isConnected, address } = useAccount();

  if (!isConnected) {
    return <WalletConnectPrompt />;
  }

  return <Dashboard userAddress={address!} />;
}
