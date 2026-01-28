'use client';

// Navigation bar component with wallet connection and theme toggle
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from './Button';
import Link from 'next/link';

interface NavbarProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export function Navbar({ theme, toggleTheme }: NavbarProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <nav className="bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-dark-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-primary-600 dark:text-white">
            Collateral<span className="text-primary-500">Fusion</span>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            {isConnected ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <Button size="sm" variant="outline" onClick={() => disconnect()}>
                  <span className="hidden sm:inline">Disconnect</span>
                  <span className="sm:hidden">Disconnect</span>
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => connect({ connector: connectors[0] })}
              >
                <span className="hidden sm:inline">Connect Wallet</span>
                <span className="sm:hidden">Connect</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
