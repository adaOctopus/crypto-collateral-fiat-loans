import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

export const SecuritizedLoanSchemaZod = z.object({
  loanId: z.number(),
  userId: z.string(),
  verificationTokenId: z.number(),
  positionId: z.number().optional(),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  createdAt: z.date().optional(),
});

export type SecuritizedLoanInput = z.infer<typeof SecuritizedLoanSchemaZod>;

export interface ISecuritizedLoan extends Document {
  loanId: number;
  userId: string;
  verificationTokenId: number;
  positionId?: number;
  contractAddress: string;
  createdAt: Date;
}

const SecuritizedLoanSchema = new Schema<ISecuritizedLoan>(
  {
    loanId: { type: Number, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    verificationTokenId: { type: Number, required: true },
    positionId: { type: Number },
    contractAddress: { type: String, required: true, lowercase: true },
  },
  { timestamps: true }
);

export const SecuritizedLoan = mongoose.model<ISecuritizedLoan>(
  'SecuritizedLoan',
  SecuritizedLoanSchema
);
