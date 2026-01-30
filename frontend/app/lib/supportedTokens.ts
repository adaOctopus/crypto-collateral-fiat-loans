/**
 * Supported collateral token addresses and labels per network.
 * WETH = Wrapped ETH (1:1 with ETH) — use for demo when locking "ETH".
 */

export type NetworkKey = 'sepolia' | 'mainnet';

// Canonical WETH and stablecoins per chain
export const SUPPORTED_TOKENS: Record<NetworkKey, Record<string, string>> = {
  sepolia: {
    '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14': 'WETH',
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 'USDC',
    '0xdAC17F958D2ee523a2206206994597C13D831ec7': 'USDT',
  },
  mainnet: {
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 'WETH',
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 'USDC',
    '0xdAC17F958D2ee523a2206206994597C13D831ec7': 'USDT',
  },
};

export const WETH_ADDRESSES: Record<NetworkKey, string> = {
  sepolia: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
  mainnet: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
};

export const PRESET_TOKENS: { value: string; label: string; key: 'WETH' | 'USDC' | 'USDT' }[] = [
  { value: 'WETH', label: 'WETH (Wrapped ETH)', key: 'WETH' },
  { value: 'USDC', label: 'USDC', key: 'USDC' },
  { value: 'USDT', label: 'USDT', key: 'USDT' },
];

const ADDRESS_BY_SYMBOL: Record<NetworkKey, Record<string, string>> = {
  sepolia: {
    WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
  mainnet: {
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
};

export function getNetworkKey(chainId: number): NetworkKey {
  return chainId === 1 ? 'mainnet' : 'sepolia';
}

export function getTokenAddress(symbol: string, chainId: number): string {
  const network = getNetworkKey(chainId);
  return ADDRESS_BY_SYMBOL[network][symbol] ?? '';
}

export function getTokenSymbol(tokenAddress: string, chainId: number): string {
  const network = getNetworkKey(chainId);
  const map = SUPPORTED_TOKENS[network];
  return map?.[tokenAddress] ?? 'TOKEN';
}
