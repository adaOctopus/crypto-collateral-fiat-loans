import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

// Zod schema for validation
export const InterestPaymentSchemaZod = z.object({
  userId: z.string(),
  positionId: z.number(),
  amount: z.string(), // BigNumber as string
  dueDate: z.date(),
  paidDate: z.date().nullable(),
  isPaid: z.boolean(),
  isLate: z.boolean(),
  daysLate: z.number().default(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type InterestPaymentInput = z.infer<typeof InterestPaymentSchemaZod>;

// Mongoose schema (exported so return types can be named elsewhere)
export interface IInterestPayment extends Document {
  userId: string;
  positionId: number;
  amount: string;
  dueDate: Date;
  paidDate: Date | null;
  isPaid: boolean;
  isLate: boolean;
  daysLate: number;
  createdAt: Date;
  updatedAt: Date;
}

const InterestPaymentSchema = new Schema<IInterestPayment>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    positionId: {
      type: Number,
      required: true,
      index: true,
    },
    amount: {
      type: String,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    paidDate: {
      type: Date,
      default: null,
    },
    isPaid: {
      type: Boolean,
      default: false,
      index: true,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    daysLate: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
InterestPaymentSchema.index({ userId: 1, positionId: 1 });
InterestPaymentSchema.index({ dueDate: 1, isPaid: 1 });

export const InterestPayment = mongoose.model<IInterestPayment>(
  'InterestPayment',
  InterestPaymentSchema
);
