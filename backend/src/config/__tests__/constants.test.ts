/**
 * Unit tests for config constants.
 * Ensures API limits and loan rules are correctly defined (security & backpressure).
 */
import { LOAN_RULES, API_LIMITS } from '../constants';

describe('LOAN_RULES', () => {
  it('defines ANNUAL_INTEREST_RATE in basis points', () => {
    expect(LOAN_RULES.ANNUAL_INTEREST_RATE).toBe(1200); // 12%
    expect(LOAN_RULES.ANNUAL_INTEREST_RATE).toBeGreaterThan(0);
    expect(LOAN_RULES.ANNUAL_INTEREST_RATE).toBeLessThanOrEqual(10000); // sanity: max 100%
  });

  it('defines payment frequency', () => {
    expect(LOAN_RULES.PAYMENT_FREQUENCY_DAYS).toBe(30);
  });

  it('UNLOCK_RULES enforce minimum payments and max percentage', () => {
    expect(LOAN_RULES.UNLOCK_RULES.MIN_PAYMENTS_FOR_UNLOCK).toBeGreaterThanOrEqual(0);
    expect(LOAN_RULES.UNLOCK_RULES.MAX_UNLOCK_PERCENTAGE).toBeGreaterThan(0);
    expect(LOAN_RULES.UNLOCK_RULES.MAX_UNLOCK_PERCENTAGE).toBeLessThanOrEqual(100);
  });
});

describe('API_LIMITS', () => {
  it('defines bounded list limits to prevent unbounded queries', () => {
    expect(API_LIMITS.MAX_LIST_POSITIONS).toBeLessThanOrEqual(1000);
    expect(API_LIMITS.MAX_LIST_POSITIONS).toBeGreaterThan(0);
    expect(API_LIMITS.MAX_LIST_PAYMENTS).toBeLessThanOrEqual(1000);
    expect(API_LIMITS.MAX_LIST_LOANS).toBeLessThanOrEqual(1000);
  });

  it('defines max body size for request safety', () => {
    expect(API_LIMITS.MAX_BODY_SIZE_KB).toBeGreaterThan(0);
    expect(API_LIMITS.MAX_BODY_SIZE_KB).toBeLessThan(10_000); // sanity
  });
});
