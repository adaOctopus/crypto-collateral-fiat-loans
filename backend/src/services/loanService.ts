import { InterestPayment } from '../models/InterestPayment';
import { CollateralPosition } from '../models/CollateralPosition';
import { LOAN_RULES } from '../config/constants';
import { ethers } from 'ethers';

/**
 * Service for managing loan calculations and interest payments
 */
export class LoanService {
  /**
   * Calculate monthly interest payment amount
   */
  static calculateMonthlyInterest(loanAmountUSD: string): string {
    const loanAmount = BigInt(loanAmountUSD);
    const annualRate = BigInt(LOAN_RULES.ANNUAL_INTEREST_RATE);
    const monthlyRate = annualRate / BigInt(12); // Divide by 12 months
    const interest = (loanAmount * monthlyRate) / BigInt(10000); // Basis points
    
    return interest.toString();
  }

  /**
   * Generate interest payment schedule for a position
   */
  static generatePaymentSchedule(
    positionId: number,
    userId: string,
    loanAmountUSD: string,
    startDate: Date
  ): Array<{
    positionId: number;
    userId: string;
    amount: string;
    dueDate: Date;
    isPaid: boolean;
    isLate: boolean;
    daysLate: number;
  }> {
    const monthlyPayment = this.calculateMonthlyInterest(loanAmountUSD);
    const schedule = [];
    const paymentFrequencyDays = LOAN_RULES.PAYMENT_FREQUENCY_DAYS;

    // Generate 12 months of payments
    for (let i = 0; i < 12; i++) {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + (i + 1) * paymentFrequencyDays);

      schedule.push({
        positionId,
        userId,
        amount: monthlyPayment,
        dueDate,
        isPaid: false,
        isLate: false,
        daysLate: 0,
      });
    }

    return schedule;
  }

  /**
   * Check and update late payment status
   */
  static async checkLatePayments() {
    const now = new Date();
    const lateThreshold = LOAN_RULES.LATE_PAYMENT_THRESHOLDS.LATE;

    const unpaidPayments = await InterestPayment.find({
      isPaid: false,
      dueDate: { $lt: now },
    });

    for (const payment of unpaidPayments) {
      const daysLate = Math.floor(
        (now.getTime() - payment.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      payment.isLate = daysLate >= lateThreshold;
      payment.daysLate = daysLate;
      await payment.save();
    }
  }

  /**
   * Record interest payment and update credit score
   */
  static async recordPayment(
    userId: string,
    positionId: number,
    paidDate: Date = new Date()
  ) {
    const payment = await InterestPayment.findOne({
      userId,
      positionId,
      isPaid: false,
    }).sort({ dueDate: 1 }); // Get earliest unpaid payment

    if (!payment) {
      throw new Error('No unpaid payment found');
    }

    const now = new Date();
    const daysLate = Math.floor(
      (now.getTime() - payment.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    payment.isPaid = true;
    payment.paidDate = paidDate;
    payment.isLate = daysLate > 0;
    payment.daysLate = daysLate > 0 ? daysLate : 0;

    await payment.save();

    // Update credit score on NFT
    await this.updateCreditScore(userId, positionId, daysLate <= 0);

    return payment;
  }

  /**
   * Update credit score on NFT based on payment history
   */
  private static async updateCreditScore(
    userId: string,
    positionId: number,
    isOnTime: boolean
  ) {
    const position = await CollateralPosition.findOne({ positionId });
    if (!position) {
      throw new Error('Position not found');
    }

    // Get payment history
    const payments = await InterestPayment.find({
      userId,
      positionId,
    });

    const onTimeCount = payments.filter((p) => p.isPaid && !p.isLate).length;
    const lateCount = payments.filter((p) => p.isPaid && p.isLate).length;

    // Calculate new score (simplified - start at 50, adjust based on payments)
    let baseScore = 50;
    baseScore += onTimeCount * LOAN_RULES.SCORE_ADJUSTMENTS.ON_TIME_PAYMENT;
    baseScore -= lateCount * LOAN_RULES.SCORE_ADJUSTMENTS.LATE_PAYMENT;

    // Clamp between 0 and 100
    const newScore = Math.max(0, Math.min(100, baseScore));

    // In production, call contract to update NFT credit score
    // For now, we'll store it in the database
    // await contractService.updateCreditScore(position.nftTokenId, newScore, isOnTime);

    return newScore;
  }

  /**
   * Check if user can unlock collateral based on payment history
   */
  static async canUnlockCollateral(
    userId: string,
    positionId: number,
    unlockPercentage: number
  ): Promise<{ canUnlock: boolean; reason?: string }> {
    const position = await CollateralPosition.findOne({ positionId, userId });
    if (!position) {
      return { canUnlock: false, reason: 'Position not found' };
    }

    if (!position.isActive) {
      return { canUnlock: false, reason: 'Position is not active' };
    }

    // Check minimum payments
    const paidPayments = await InterestPayment.countDocuments({
      userId,
      positionId,
      isPaid: true,
    });

    if (paidPayments < LOAN_RULES.UNLOCK_RULES.MIN_PAYMENTS_FOR_UNLOCK) {
      return {
        canUnlock: false,
        reason: `Minimum ${LOAN_RULES.UNLOCK_RULES.MIN_PAYMENTS_FOR_UNLOCK} payments required`,
      };
    }

    // Check unlock percentage
    if (unlockPercentage > LOAN_RULES.UNLOCK_RULES.MAX_UNLOCK_PERCENTAGE) {
      return {
        canUnlock: false,
        reason: `Maximum unlock percentage is ${LOAN_RULES.UNLOCK_RULES.MAX_UNLOCK_PERCENTAGE}%`,
      };
    }

    return { canUnlock: true };
  }
}
