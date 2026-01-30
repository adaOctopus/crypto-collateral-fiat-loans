import { Router } from 'express';
import { createSecuritizedLoan, listSecuritizedLoans } from '../controllers/securitizedLoanController';

const router = Router();
router.post('/', createSecuritizedLoan);
router.get('/', listSecuritizedLoans);

export default router;
