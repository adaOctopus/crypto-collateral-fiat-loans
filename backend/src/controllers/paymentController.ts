import { Request, Response } from 'express';
import { InterestPayment } from '../models';
import { LoanService } from '../services/loanService';

/**
 * Record an interest payment
 */
export const recordPayment = async (req: Request, res: Response) => {
  try {
    const { walletAddress, positionId } = req.body;

    // Validate payment
    const payment = await LoanService.recordPayment(
      walletAddress.toLowerCase(),
      parseInt(positionId)
    );

    res.json({
      message: 'Payment recorded successfully',
      payment,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to record payment', message: error.message });
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
      .limit(50);

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
