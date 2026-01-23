import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

// Zod schema for validation
export const UserSchemaZod = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  email: z.string().email().optional(),
  bankAccountInfo: z.object({
    accountNumber: z.string().optional(),
    routingNumber: z.string().optional(),
    bankName: z.string().optional(),
  }).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type UserInput = z.infer<typeof UserSchemaZod>;

// Mongoose schema
interface IUser extends Document {
  walletAddress: string;
  email?: string;
  bankAccountInfo?: {
    accountNumber?: string;
    routingNumber?: string;
    bankName?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    email: {
      type: String,
      sparse: true,
    },
    bankAccountInfo: {
      accountNumber: String,
      routingNumber: String,
      bankName: String,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
