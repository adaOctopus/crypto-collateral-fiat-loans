'use client';

// Wallet selection modal component showing multiple EVM wallet options
import { useState, useEffect } from 'react';
import { useConnect, useAccount } from 'wagmi';
import { Button } from './Button';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connect, connectors, isPending, error, status } = useConnect();
  const { isConnected, address } = useAccount();
  const [connectingTo, setConnectingTo] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Close modal when successfully connected
  useEffect(() => {
    if (isConnected && isOpen) {
      setConnectingTo(null);
      setConnectionError(null);
      onClose();
    }
  }, [isConnected, isOpen, onClose]);

  // Reset error when modal closes
  useEffect(() => {
    if (!isOpen) {
      setConnectionError(null);
      setConnectingTo(null);
    }
  }, [isOpen]);

  // Handle connection errors
  useEffect(() => {
    if (error) {
      setConnectionError(error.message || 'Failed to connect wallet. Please try again.');
      setConnectingTo(null);
    }
  }, [error]);

  if (!isOpen) return null;

  const handleConnect = (connector: any) => {
    // Reset any previous errors
    setConnectionError(null);
    setConnectingTo(connector.name);
    
    // Basic check for injected wallets
    if (connector.type === 'injected') {
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        setConnectionError('No wallet extension found. Please install MetaMask or another wallet extension.');
        setConnectingTo(null);
        return;
      }
    }

    // Use wagmi's connect - it will handle the MetaMask popup automatically
    // Don't add any delays or extra checks that might trigger MetaMask errors
    try {
      connect({ connector });
    } catch (err: any) {
      console.error('Connection error:', err);
      setConnectionError(err.message || 'Failed to connect wallet. Please try again.');
      setConnectingTo(null);
    }
  };

  // Filter and organize connectors
  const injectedConnector = connectors.find((c) => c.type === 'injected');
  const walletConnectConnector = connectors.find((c) => c.id === 'walletConnect');
  const coinbaseConnector = connectors.find((c) => c.id === 'coinbaseWalletSDK');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border border-gray-200 dark:border-dark-hover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Connect Wallet
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {isConnected ? (
          <div className="mb-6 p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200 font-medium">
              ✓ Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Choose a wallet to connect to CollateralFusion
            </p>
            <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                💡 Make sure MetaMask is <strong>unlocked</strong> and you're on the <strong>Sepolia</strong> or <strong>Mainnet</strong> network.
              </p>
            </div>
          </>
        )}

        <div className="space-y-3">
          {/* MetaMask / Injected Wallet */}
          {injectedConnector && (
            <WalletOption
              name="MetaMask"
              icon="🦊"
              description="Connect using MetaMask or other injected wallets"
              onClick={() => handleConnect(injectedConnector)}
              isConnecting={connectingTo === injectedConnector.name || (isPending && connectingTo === injectedConnector.name)}
              disabled={isPending && connectingTo !== null}
            />
          )}

          {/* WalletConnect */}
          {walletConnectConnector && (
            <WalletOption
              name="WalletConnect"
              icon="🔗"
              description="Scan QR code with your mobile wallet"
              onClick={() => handleConnect(walletConnectConnector)}
              isConnecting={connectingTo === walletConnectConnector.name || (isPending && connectingTo === walletConnectConnector.name)}
              disabled={isPending && connectingTo !== null}
            />
          )}

          {/* Coinbase Wallet */}
          {coinbaseConnector && (
            <WalletOption
              name="Coinbase Wallet"
              icon="📱"
              description="Connect using Coinbase Wallet"
              onClick={() => handleConnect(coinbaseConnector)}
              isConnecting={connectingTo === coinbaseConnector.name || (isPending && connectingTo === coinbaseConnector.name)}
              disabled={isPending && connectingTo !== null}
            />
          )}

          {connectors.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No wallets available. Please install a wallet extension.
            </div>
          )}
        </div>

        {(error || connectionError) && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 rounded-lg text-sm">
            {connectionError || error?.message || 'Failed to connect wallet. Please try again.'}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-dark-hover">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            New to Ethereum?{' '}
            <a
              href="https://ethereum.org/en/wallets/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-500 hover:text-primary-600 underline"
            >
              Learn more about wallets
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

interface WalletOptionProps {
  name: string;
  icon: string;
  description: string;
  onClick: () => void;
  isConnecting: boolean;
  disabled: boolean;
}

function WalletOption({
  name,
  icon,
  description,
  onClick,
  isConnecting,
  disabled,
}: WalletOptionProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 dark:border-dark-hover bg-white dark:bg-dark-bg hover:border-primary-500 dark:hover:border-primary-500 hover:bg-gray-50 dark:hover:bg-dark-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="text-3xl">{icon}</div>
      <div className="flex-1 text-left">
        <div className="font-semibold text-gray-900 dark:text-white">{name}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">{description}</div>
      </div>
      {isConnecting && (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
      )}
    </button>
  );
}
