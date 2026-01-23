import { Request, Response } from 'express';
import { User, UserSchemaZod } from '../models';

/**
 * Register a new user
 */
export const registerUser = async (req: Request, res: Response) => {
  try {
    const validatedData = UserSchemaZod.parse(req.body);

    // Check if user already exists
    const existingUser = await User.findOne({
      walletAddress: validatedData.walletAddress.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = new User({
      ...validatedData,
      walletAddress: validatedData.walletAddress.toLowerCase(),
    });

    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to register user', message: error.message });
  }
};

/**
 * Get user profile
 */
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;

    const user = await User.findOne({
      walletAddress: walletAddress.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        email: user.email,
        bankAccountInfo: user.bankAccountInfo,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get user profile', message: error.message });
  }
};

/**
 * Update bank account information
 */
export const updateBankAccount = async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    const { bankAccountInfo } = req.body;

    const user = await User.findOne({
      walletAddress: walletAddress.toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.bankAccountInfo = bankAccountInfo;
    await user.save();

    res.json({
      message: 'Bank account information updated',
      bankAccountInfo: user.bankAccountInfo,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update bank account', message: error.message });
  }
};
