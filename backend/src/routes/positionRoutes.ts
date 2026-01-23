import { Router } from 'express';
import {
  createPosition,
  getUserPositions,
  getPositionDetails,
} from '../controllers/positionController';

const router = Router();

router.post('/', createPosition);
router.get('/user/:walletAddress', getUserPositions);
router.get('/:positionId', getPositionDetails);

export default router;
