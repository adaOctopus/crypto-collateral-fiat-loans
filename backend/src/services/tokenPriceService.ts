import { getContractService } from './contractService';

const COINGECKO_WETH_PRICE_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=weth&vs_currencies=usd';

/**
 * Fetch live WETH price in USD from CoinGecko (no API key required).
 */
export async function getWethLivePriceUSD(): Promise<number> {
  const res = await fetch(COINGECKO_WETH_PRICE_URL);
  if (!res.ok) {
    throw new Error(`CoinGecko request failed: ${res.status}`);
  }
  const data = (await res.json()) as { weth?: { usd?: number } };
  const price = data?.weth?.usd;
  if (typeof price !== 'number' || price <= 0) {
    throw new Error('Invalid or missing WETH price from API');
  }
  return price;
}

/**
 * Update token price on-chain (CollateralLock.setTokenPrice).
 * If tokenAddress is not provided, uses WETH_CONTRACT_ADDRESS from env.
 * Only succeeds when CONTRACT_OWNER_PRIVATE_KEY is set (contract owner).
 */
export async function updateTokenPriceOnChain(
  priceUSD: number,
  tokenAddress?: string
): Promise<{ updated: boolean; txHash?: string; priceUSD: number; tokenAddress: string }> {
  const address = tokenAddress ?? process.env.WETH_CONTRACT_ADDRESS;
  if (!address) {
    throw new Error('Token address required (pass tokenAddress or set WETH_CONTRACT_ADDRESS)');
  }
  const contractService = getContractService();
  const txHash = await contractService.setTokenPrice(address, priceUSD);
  return {
    updated: !!txHash,
    txHash: txHash ?? undefined,
    priceUSD,
    tokenAddress: address,
  };
}

/**
 * Fetch WETH live price and update it on-chain. For use by cron (e.g. daily).
 */
export async function fetchAndUpdateWethPrice(): Promise<{
  updated: boolean;
  txHash?: string;
  priceUSD: number;
  tokenAddress: string;
}> {
  const priceUSD = await getWethLivePriceUSD();
  return updateTokenPriceOnChain(priceUSD);
}
