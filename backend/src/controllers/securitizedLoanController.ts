import { Request, Response } from 'express';
import { SecuritizedLoan, SecuritizedLoanSchemaZod } from '../models';
import { API_LIMITS } from '../config/constants';

export const createSecuritizedLoan = async (req: Request, res: Response) => {
  try {
    const validated = SecuritizedLoanSchemaZod.parse(req.body);
    const existing = await SecuritizedLoan.findOne({ loanId: validated.loanId });
    if (existing) {
      return res.status(400).json({ error: 'Loan already registered' });
    }
    const loan = new SecuritizedLoan(validated);
    await loan.save();
    console.log('[SecuritizedLoan] Created', { loanId: loan.loanId, userId: loan.userId, verificationTokenId: loan.verificationTokenId });
    res.status(201).json({ message: 'Securitized loan recorded', loan });
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown; message?: string };
    if (err?.name === 'ZodError') {
      console.error('[SecuritizedLoan] Validation failed:', JSON.stringify(err.errors, null, 2));
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    console.error('[SecuritizedLoan] Create error:', err?.message ?? error);
    res.status(500).json({ error: 'Failed to record securitized loan', message: err?.message ?? 'Unknown error' });
  }
};

export const listSecuritizedLoans = async (req: Request, res: Response) => {
  try {
    const loans = await SecuritizedLoan.find()
      .sort({ createdAt: -1 })
      .limit(API_LIMITS.MAX_LIST_LOANS);
    res.json({ loans });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to list loans', message: (error as Error).message });
  }
};
