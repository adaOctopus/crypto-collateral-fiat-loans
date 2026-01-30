import { Request, Response } from 'express';
import { SecuritizedLoan, SecuritizedLoanSchemaZod } from '../models';

export const createSecuritizedLoan = async (req: Request, res: Response) => {
  try {
    const validated = SecuritizedLoanSchemaZod.parse(req.body);
    const existing = await SecuritizedLoan.findOne({ loanId: validated.loanId });
    if (existing) {
      return res.status(400).json({ error: 'Loan already registered' });
    }
    const loan = new SecuritizedLoan(validated);
    await loan.save();
    res.status(201).json({ message: 'Securitized loan recorded', loan });
  } catch (error: unknown) {
    const err = error as { name?: string; errors?: unknown; message?: string };
    if (err?.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to record securitized loan', message: err?.message ?? 'Unknown error' });
  }
};

export const listSecuritizedLoans = async (req: Request, res: Response) => {
  try {
    const loans = await SecuritizedLoan.find().sort({ createdAt: -1 }).limit(100);
    res.json({ loans });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to list loans', message: (error as Error).message });
  }
};
