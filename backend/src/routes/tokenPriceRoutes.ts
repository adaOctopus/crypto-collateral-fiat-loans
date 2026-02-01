import { Router } from 'express';
import { updateTokenPrice, getLiveWethPrice } from '../controllers/tokenPriceController';

const router = Router();

/** POST /api/token-price/update - Fetch live price (or use body.priceUSD) and update on-chain. For cron. */
router.post('/update', updateTokenPrice);

/** GET /api/token-price/live - Get current WETH price from API (no on-chain update). */
router.get('/live', getLiveWethPrice);

export default router;
