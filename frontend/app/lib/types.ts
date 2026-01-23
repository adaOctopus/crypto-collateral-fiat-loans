// Shared TypeScript types for the application

export interface Position {
  _id: string;
  positionId: number;
  tokenSymbol: string;
  amount: string;
  loanAmountUSD: string;
  collateralRatio: number;
  isActive: boolean;
  paymentStats: {
    total: number;
    paid: number;
    unpaid: number;
    late: number;
  };
}

export interface User {
  walletAddress: string;
  email?: string;
  bankAccountInfo?: {
    accountNumber?: string;
    routingNumber?: string;
    bankName?: string;
  };
}
