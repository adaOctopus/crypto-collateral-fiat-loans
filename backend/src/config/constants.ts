/**
 * Loan Rules - Hardcoded in backend as per requirements
 * These rules govern the loan system and cannot be changed without code update
 */

export const LOAN_RULES = {
  // Interest rates (annual percentage, in basis points)
  ANNUAL_INTEREST_RATE: 1200, // 12% APR
  
  // Payment schedule
  PAYMENT_FREQUENCY_DAYS: 30, // Monthly payments
  
  // Credit score thresholds
  CREDIT_SCORE: {
    EXCELLENT: 80, // 80-100: Excellent payer
    GOOD: 60, // 60-79: Good payer
    FAIR: 40, // 40-59: Fair payer
    POOR: 0, // 0-39: Poor payer
  },
  
  // Credit score adjustments
  SCORE_ADJUSTMENTS: {
    ON_TIME_PAYMENT: +5, // Increase score by 5 for on-time payment
    LATE_PAYMENT: -10, // Decrease score by 10 for late payment
    VERY_LATE_PAYMENT: -20, // Decrease by 20 for very late (>60 days)
  },
  
  // Unlock rules based on payments
  UNLOCK_RULES: {
    MIN_PAYMENTS_FOR_UNLOCK: 1, // Minimum payments before unlock allowed
    MAX_UNLOCK_PERCENTAGE: 25, // Maximum 25% of collateral per unlock
    REQUIRED_PAYMENTS_FOR_FULL_UNLOCK: 12, // 12 months for full unlock eligibility
  },
  
  // Late payment thresholds (in days)
  LATE_PAYMENT_THRESHOLDS: {
    LATE: 7, // 7 days late
    VERY_LATE: 30, // 30 days late
    DEFAULT: 60, // 60 days = default
  },
} as const;

export type LoanRules = typeof LOAN_RULES;
