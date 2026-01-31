import { Request, Response } from 'express';
import { InterestPayment } from '../models';
import { LoanService } from '../services/loanService';
import { API_LIMITS } from '../config/constants';

/**
 * Record an interest payment (fake money). If amount is provided, it must match the next unpaid payment for that position.
 */
export const recordPayment = async (req: Request, res: Response) => {
  try {
    const { walletAddress, positionId, amount } = req.body;
    const userId = (walletAddress as string)?.toLowerCase();
    const posId = parseInt(positionId, 10);

    if (!userId || isNaN(posId)) {
      return res.status(400).json({ error: 'walletAddress and positionId required' });
    }

    const payment = await LoanService.recordPayment(userId, posId, amount != null ? parseFloat(amount) : undefined);

    res.json({
      message: 'Payment recorded successfully',
      payment,
    });
  } catch (error: any) {
    const status = error.message?.includes('Invalid amount') || error.message?.includes('No unpaid') ? 400 : 500;
    res.status(status).json({ error: 'Failed to record payment', message: error.message });
  }
};

/**
 * Get next unpaid payment for a user's position (for Pay Loan form)
 */
export const getNextUnpaid = async (req: Request, res: Response) => {
  try {
    const { walletAddress, positionId } = req.query;
    const userId = (walletAddress as string)?.toLowerCase();
    const posId = parseInt(positionId as string, 10);

    if (!userId || isNaN(posId)) {
      return res.status(400).json({ error: 'walletAddress and positionId required' });
    }

    const next = await LoanService.getNextUnpaidPayment(userId, posId);
    if (!next) {
      return res.status(404).json({ error: 'No unpaid payment for this position' });
    }
    res.json(next);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get next payment', message: error.message });
  }
};

/**
 * Get payment history for a user
 */
export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const payments = await InterestPayment.find({
      userId: walletAddress.toLowerCase(),
    })
      .sort({ dueDate: -1 })
      .limit(API_LIMITS.MAX_LIST_PAYMENTS);

    res.json({ payments });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get payment history', message: error.message });
  }
};

/**
 * Check if user can unlock collateral
 */
export const checkUnlockEligibility = async (req: Request, res: Response) => {
  try {
    const { walletAddress, positionId, unlockPercentage } = req.query;

    const result = await LoanService.canUnlockCollateral(
      (walletAddress as string).toLowerCase(),
      parseInt(positionId as string),
      parseFloat(unlockPercentage as string)
    );

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to check eligibility', message: error.message });
  }
};
