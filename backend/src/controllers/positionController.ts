import { Request, Response } from 'express';
import { CollateralPosition, InterestPayment } from '../models';
import { LoanService } from '../services/loanService';
import { CollateralPositionSchemaZod } from '../models';

/**
 * Create a new collateral position (called after on-chain lock)
 */
export const createPosition = async (req: Request, res: Response) => {
  try {
    const validatedData = CollateralPositionSchemaZod.parse(req.body);

    // Check if position already exists
    const existing = await CollateralPosition.findOne({
      positionId: validatedData.positionId,
    });

    if (existing) {
      return res.status(400).json({ error: 'Position already exists' });
    }

    const position = new CollateralPosition(validatedData);
    await position.save();

    // Generate interest payment schedule
    const schedule = LoanService.generatePaymentSchedule(
      position.positionId,
      position.userId,
      position.loanAmountUSD,
      position.lockTimestamp
    );

    // Create payment records
    await InterestPayment.insertMany(schedule);

    res.status(201).json({
      message: 'Position created successfully',
      position,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create position', message: error.message });
  }
};

/**
 * Get user's positions
 */
export const getUserPositions = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const positions = await CollateralPosition.find({
      userId: walletAddress.toLowerCase(),
    }).sort({ createdAt: -1 });

    // Get payment info for each position
    const positionsWithPayments = await Promise.all(
      positions.map(async (position) => {
        const payments = await InterestPayment.find({
          positionId: position.positionId,
        });

        const paidCount = payments.filter((p) => p.isPaid).length;
        const unpaidCount = payments.filter((p) => !p.isPaid).length;
        const lateCount = payments.filter((p) => p.isLate).length;

        return {
          ...position.toObject(),
          paymentStats: {
            total: payments.length,
            paid: paidCount,
            unpaid: unpaidCount,
            late: lateCount,
          },
        };
      })
    );

    res.json({ positions: positionsWithPayments });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get positions', message: error.message });
  }
};

/**
 * Get position details with payment history
 */
export const getPositionDetails = async (req: Request, res: Response) => {
  try {
    const { positionId } = req.params;

    const position = await CollateralPosition.findOne({
      positionId: parseInt(positionId),
    });

    if (!position) {
      return res.status(404).json({ error: 'Position not found' });
    }

    const payments = await InterestPayment.find({
      positionId: position.positionId,
    }).sort({ dueDate: 1 });

    res.json({
      position,
      payments,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get position details', message: error.message });
  }
};
