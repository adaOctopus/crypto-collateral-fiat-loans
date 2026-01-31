import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

// Zod schema for validation
// Use coerce for dates: JSON sends ISO strings, not Date instances
export const CollateralPositionSchemaZod = z.object({
  userId: z.string(),
  positionId: z.number(),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tokenSymbol: z.string(),
  amount: z.string(), // BigNumber as string
  loanAmountUSD: z.string(), // BigNumber as string
  collateralRatio: z.number(),
  nftTokenId: z.number(),
  lockTimestamp: z.coerce.date(),
  unlockTimestamp: z.coerce.date().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export type CollateralPositionInput = z.infer<typeof CollateralPositionSchemaZod>;

// Mongoose schema
interface ICollateralPosition extends Document {
  userId: string;
  positionId: number;
  contractAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  amount: string;
  loanAmountUSD: string;
  collateralRatio: number;
  nftTokenId: number;
  lockTimestamp: Date;
  unlockTimestamp: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CollateralPositionSchema = new Schema<ICollateralPosition>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    positionId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    contractAddress: {
      type: String,
      required: true,
      lowercase: true,
    },
    tokenAddress: {
      type: String,
      required: true,
      lowercase: true,
    },
    tokenSymbol: {
      type: String,
      required: true,
    },
    amount: {
      type: String,
      required: true,
    },
    loanAmountUSD: {
      type: String,
      required: true,
    },
    collateralRatio: {
      type: Number,
      required: true,
    },
    nftTokenId: {
      type: Number,
      required: true,
    },
    lockTimestamp: {
      type: Date,
      required: true,
    },
    unlockTimestamp: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const CollateralPosition = mongoose.model<ICollateralPosition>(
  'CollateralPosition',
  CollateralPositionSchema
);
