import { Router } from 'express';
import {
  registerUser,
  getUserProfile,
  updateBankAccount,
} from '../controllers/userController';

const router = Router();

router.post('/register', registerUser);
router.get('/:walletAddress', getUserProfile);
router.put('/:walletAddress/bank-account', updateBankAccount);

export default router;
