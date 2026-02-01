/**
 * Unit tests for LoanService business logic.
 * Focuses on pure functions (no DB) to ensure deterministic behavior.
 */
import { LoanService } from '../loanService';
import { LOAN_RULES } from '../../config/constants';

describe('LoanService', () => {
  describe('calculateMonthlyInterest', () => {
    it('calculates correct monthly interest for $10,000 loan at 12% APR', () => {
      const loanAmountUSD = (10_000n * 10n ** 18n).toString();
      const result = LoanService.calculateMonthlyInterest(loanAmountUSD);
      // 12% APR = 1% monthly. $10,000 * 1% = $100
      // In 18 decimals: 100 * 1e18
      expect(BigInt(result)).toBe(100n * 10n ** 18n);
    });

    it('calculates correct interest for $1 loan', () => {
      const loanAmountUSD = (1n * 10n ** 18n).toString();
      const result = LoanService.calculateMonthlyInterest(loanAmountUSD);
      // 1% of 1 = 0.01, in 18 decimals
      expect(BigInt(result)).toBe(10n ** 16n);
    });

    it('handles zero loan amount', () => {
      const result = LoanService.calculateMonthlyInterest('0');
      expect(result).toBe('0');
    });

    it('respects ANNUAL_INTEREST_RATE from constants', () => {
      expect(LOAN_RULES.ANNUAL_INTEREST_RATE).toBe(1200); // 12%
    });
  });

  describe('generatePaymentSchedule', () => {
    it('generates 12 monthly payments', () => {
      const startDate = new Date('2024-01-01');
      const schedule = LoanService.generatePaymentSchedule(
        1,
        'user-1',
        (10_000n * 10n ** 18n).toString(),
        startDate
      );
      expect(schedule).toHaveLength(12);
    });

    it('each payment has correct structure', () => {
      const startDate = new Date('2024-01-15');
      const schedule = LoanService.generatePaymentSchedule(
        5,
        'user-abc',
        (5_000n * 10n ** 18n).toString(),
        startDate
      );

      schedule.forEach((payment, i) => {
        expect(payment.positionId).toBe(5);
        expect(payment.userId).toBe('user-abc');
        expect(payment.amount).toBeDefined();
        expect(BigInt(payment.amount)).toBeGreaterThan(0n);
        expect(payment.dueDate).toBeInstanceOf(Date);
        expect(payment.isPaid).toBe(false);
        expect(payment.isLate).toBe(false);
        expect(payment.daysLate).toBe(0);
      });
    });

    it('due dates follow PAYMENT_FREQUENCY_DAYS spacing', () => {
      const startDate = new Date('2024-01-01T12:00:00Z');
      const schedule = LoanService.generatePaymentSchedule(
        0,
        'u',
        (1_000n * 10n ** 18n).toString(),
        startDate
      );

      expect(LOAN_RULES.PAYMENT_FREQUENCY_DAYS).toBe(30);

      // Each payment is (i+1)*30 days from start; diff between consecutive = 30 (allowing DST tolerance)
      for (let i = 1; i < schedule.length; i++) {
        const prev = schedule[i - 1].dueDate.getTime();
        const curr = schedule[i].dueDate.getTime();
        const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBeGreaterThanOrEqual(29);
        expect(diffDays).toBeLessThanOrEqual(31);
      }
    });
  });

  describe('LOAN_RULES constants', () => {
    it('UNLOCK_RULES are defined correctly', () => {
      expect(LOAN_RULES.UNLOCK_RULES.MIN_PAYMENTS_FOR_UNLOCK).toBe(1);
      expect(LOAN_RULES.UNLOCK_RULES.MAX_UNLOCK_PERCENTAGE).toBe(25);
    });

    it('LATE_PAYMENT_THRESHOLDS are defined', () => {
      expect(LOAN_RULES.LATE_PAYMENT_THRESHOLDS.LATE).toBe(7);
      expect(LOAN_RULES.LATE_PAYMENT_THRESHOLDS.VERY_LATE).toBe(30);
    });
  });
});
