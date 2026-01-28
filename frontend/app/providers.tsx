'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { useState, useEffect } from 'react';
import { ThemeProvider } from './components/ThemeProvider';

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '';

// Create connectors with better error handling
const connectors = [
  injected({ 
    shimDisconnect: true,
  }),
  ...(projectId
    ? [
        walletConnect({
          projectId,
          showQrModal: false, // We'll handle the modal ourselves
        }),
        coinbaseWallet({
          appName: 'CollateralFusion',
          appLogoUrl: 'https://collateralfusion.com/logo.png',
        }),
      ]
    : []),
];

const config = createConfig({
  chains: [sepolia, mainnet],
  connectors,
  transports: {
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
      },
      mutations: {
        onError: (error) => {
          console.error('Mutation error:', error);
        },
      },
    },
  }));

  // Add global error handler for unhandled promise rejections
  // This only suppresses console errors, doesn't block functionality
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleError = (event: PromiseRejectionEvent) => {
      // Suppress MetaMask extension internal errors (evmAsk.js) from console
      // but don't prevent the connection from working
      const reason = event.reason;
      const errorString = JSON.stringify(reason || '');
      
      if (
        errorString.includes('evmAsk') ||
        (reason?.message && reason.message.includes('evmAsk')) ||
        (reason?.stack && reason.stack.includes('evmAsk'))
      ) {
        // Just suppress the console error, but let the connection proceed
        console.warn('MetaMask internal error (suppressed from console)');
        // Don't call preventDefault() - let the connection continue
      }
    };

    window.addEventListener('unhandledrejection', handleError);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
