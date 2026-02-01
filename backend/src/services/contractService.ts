import { ethers } from 'ethers';

// Minimal ABIs for the functions we call (read + write)
const VERIFICATION_NFT_ABI = [
  'function getCreditScore(uint256 tokenId) view returns (uint256)',
  'function getUserTokens(address user) view returns (uint256[])',
  'function updateCreditScore(uint256 tokenId, uint256 newScore, bool isOnTime)',
];

const COLLATERAL_LOCK_ABI = [
  'function getUserPositions(address user) view returns (tuple(address user, address tokenAddress, uint128 amount, uint256 loanAmount, uint256 collateralRatio, uint256 lockTimestamp, uint256 unlockTimestamp, bool isActive, uint256 nftTokenId)[])',
  'function getPosition(uint256 positionId) view returns (tuple(address user, address tokenAddress, uint128 amount, uint256 loanAmount, uint256 collateralRatio, uint256 lockTimestamp, uint256 unlockTimestamp, bool isActive, uint256 nftTokenId))',
  'function isPositionHealthy(uint256 positionId) view returns (bool)',
  'function setTokenPrice(address token, uint256 price)',
];

/**
 * Service for interacting with smart contracts.
 * Read-only by default; pass ownerPrivateKey to enable updateCreditScore and setTokenPrice (owner-only).
 */
export class ContractService {
  private provider: ethers.Provider;
  private signer: ethers.Wallet | null = null;
  private collateralLock: ethers.Contract;
  private verificationNFT: ethers.Contract;

  constructor(
    rpcUrl: string,
    collateralLockAddress: string,
    verificationNFTAddress: string,
    ownerPrivateKey?: string
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    if (ownerPrivateKey) {
      this.signer = new ethers.Wallet(ownerPrivateKey, this.provider);
      this.collateralLock = new ethers.Contract(collateralLockAddress, COLLATERAL_LOCK_ABI, this.signer);
      this.verificationNFT = new ethers.Contract(verificationNFTAddress, VERIFICATION_NFT_ABI, this.signer);
    } else {
      this.collateralLock = new ethers.Contract(collateralLockAddress, COLLATERAL_LOCK_ABI, this.provider);
      this.verificationNFT = new ethers.Contract(verificationNFTAddress, VERIFICATION_NFT_ABI, this.provider);
    }
  }

  /**
   * Get user's positions from the contract
   */
  async getUserPositions(userAddress: string) {
    return await this.collateralLock.getUserPositions(userAddress);
  }

  /**
   * Get position details
   */
  async getPosition(positionId: number) {
    return await this.collateralLock.getPosition(positionId);
  }

  /**
   * Check if position is healthy
   */
  async isPositionHealthy(positionId: number): Promise<boolean> {
    return await this.collateralLock.isPositionHealthy(positionId);
  }

  /**
   * Get user's NFT tokens
   */
  async getUserNFTs(userAddress: string) {
    return await this.verificationNFT.getUserTokens(userAddress);
  }

  /**
   * Get credit score for an NFT
   */
  async getCreditScore(nftTokenId: number) {
    return await this.verificationNFT.getCreditScore(nftTokenId);
  }

  /**
   * Update credit score on-chain (VerificationNFT). Only succeeds if this service was constructed with owner private key.
   */
  async updateCreditScore(nftTokenId: number, newScore: number, isOnTime: boolean): Promise<string | null> {
    if (!this.signer) {
      return null;
    }
    const tx = await this.verificationNFT.updateCreditScore(nftTokenId, newScore, isOnTime);
    const receipt = await tx.wait();
    return receipt?.hash ?? null;
  }

  /**
   * Set token price on-chain (CollateralLock). Only succeeds if this service was constructed with owner private key.
   * priceUSD is the price in USD (e.g. 2000); it will be scaled to 1e18 for the contract.
   */
  async setTokenPrice(tokenAddress: string, priceUSD: number): Promise<string | null> {
    if (!this.signer) {
      return null;
    }
    const priceWei = ethers.parseEther(priceUSD.toString());
    const tx = await this.collateralLock.setTokenPrice(tokenAddress, priceWei);
    const receipt = await tx.wait();
    return receipt?.hash ?? null;
  }
}

let _contractService: ContractService | null = null;

/**
 * Get singleton ContractService from env. Use CONTRACT_OWNER_PRIVATE_KEY to enable on-chain writes (credit score, token price).
 */
export function getContractService(): ContractService {
  if (!_contractService) {
    const rpcUrl = process.env.ETHEREUM_RPC_URL;
    const collateralLockAddress = process.env.COLLATERAL_LOCK_CONTRACT_ADDRESS;
    const verificationNFTAddress = process.env.VERIFICATION_NFT_CONTRACT_ADDRESS;
    if (!rpcUrl || !collateralLockAddress || !verificationNFTAddress) {
      throw new Error('Missing ETHEREUM_RPC_URL, COLLATERAL_LOCK_CONTRACT_ADDRESS, or VERIFICATION_NFT_CONTRACT_ADDRESS');
    }
    _contractService = new ContractService(
      rpcUrl,
      collateralLockAddress,
      verificationNFTAddress,
      process.env.CONTRACT_OWNER_PRIVATE_KEY
    );
  }
  return _contractService;
}
