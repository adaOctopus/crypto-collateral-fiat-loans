import { Request, Response } from 'express';
import {
  getWethLivePriceUSD,
  updateTokenPriceOnChain,
} from '../services/tokenPriceService';

/**
 * POST /api/token-price/update
 * Updates CollateralLock token price on-chain. For cron: call with no body to fetch live WETH price and update.
 * Optional body: { tokenAddress?, priceUSD? }. If priceUSD omitted, fetches live WETH price from API.
 */
export const updateTokenPrice = async (req: Request, res: Response) => {
  try {
    const tokenAddress = req.body?.tokenAddress as string | undefined;
    const priceUSDFromBody = req.body?.priceUSD as number | undefined;

    const priceUSD =
      priceUSDFromBody != null && typeof priceUSDFromBody === 'number'
        ? priceUSDFromBody
        : await getWethLivePriceUSD();

    const result = await updateTokenPriceOnChain(priceUSD, tokenAddress);

    res.json({
      message: result.updated ? 'Token price updated on-chain' : 'Token price not updated (owner key not set?)',
      ...result,
    });
  } catch (error: any) {
    console.error('[TokenPrice] Update failed', error?.message ?? error);
    res.status(500).json({
      error: 'Failed to update token price',
      message: error?.message ?? 'Unknown error',
    });
  }
};

/**
 * GET /api/token-price/live
 * Returns current WETH price from external API (no on-chain update).
 */
export const getLiveWethPrice = async (_req: Request, res: Response) => {
  try {
    const priceUSD = await getWethLivePriceUSD();
    res.json({ priceUSD, currency: 'usd' });
  } catch (error: any) {
    console.error('[TokenPrice] Fetch failed', error?.message ?? error);
    res.status(500).json({
      error: 'Failed to fetch live price',
      message: error?.message ?? 'Unknown error',
    });
  }
};
