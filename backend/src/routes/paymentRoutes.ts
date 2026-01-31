import { Router } from 'express';
import {
  recordPayment,
  getNextUnpaid,
  getPaymentHistory,
  checkUnlockEligibility,
} from '../controllers/paymentController';

const router = Router();

router.post('/record', recordPayment);
router.get('/next-unpaid', getNextUnpaid);
router.get('/history/:walletAddress', getPaymentHistory);
router.get('/check-unlock', checkUnlockEligibility);

export default router;
