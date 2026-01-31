/**
 * Find the exact revert reason for lockCollateral by running the same call on a
 * Sepolia fork. Etherscan and some RPCs only show "Fail" — this script throws
 * the real require() message so you can fix the issue.
 *
 * Prerequisites:
 * - .env has SEPOLIA_RPC_URL (e.g. Alchemy) and COLLATERAL_LOCK_CONTRACT_ADDRESS
 * - Optional: USER_ADDRESS = the wallet that is trying to lock (must have WETH on Sepolia)
 *
 * Usage:
 *   npx hardhat run scripts/debug-lock-revert.ts --network hardhat
 *
 * Example with custom user and amounts:
 *   USER_ADDRESS=0xYourWallet DEBUG_AMOUNT=0.0001 DEBUG_LOAN_USD=0.00003 npx hardhat run scripts/debug-lock-revert.ts --network hardhat
 */
import * as dotenv from "dotenv";
dotenv.config();

const WETH_SEPOLIA = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

async function main() {
  const hre = await import("hardhat");
  const { ethers } = hre as any;
  const provider = ethers.provider;

  const collateralLockAddress = process.env.COLLATERAL_LOCK_CONTRACT_ADDRESS;
  if (!collateralLockAddress) {
    throw new Error("Missing COLLATERAL_LOCK_CONTRACT_ADDRESS in .env");
  }
  if (!process.env.SEPOLIA_RPC_URL) {
    throw new Error("Missing SEPOLIA_RPC_URL in .env (required for fork)");
  }

  const userAddress = process.env.USER_ADDRESS;
  if (!userAddress) {
    throw new Error(
      "Missing USER_ADDRESS in .env. Set it to the wallet that is trying to lock (e.g. your MetaMask address)."
    );
  }

  const amountStr = process.env.DEBUG_AMOUNT ?? "0.0001";
  const loanUsdStr = process.env.DEBUG_LOAN_USD ?? "0.00003";
  const amountWei = ethers.parseEther(amountStr);
  const loanAmountUsdWei = ethers.parseEther(loanUsdStr);
  const minRatioBps = 12000n;

  console.log("=== Debug lockCollateral on Sepolia fork ===");
  console.log("CollateralLock:", collateralLockAddress);
  console.log("User (impersonated):", userAddress);
  console.log("WETH:", WETH_SEPOLIA);
  console.log("Amount (collateral):", amountStr, "WETH");
  console.log("Loan amount (USD, 1e18):", loanUsdStr);
  console.log("");

  const net = await provider.getNetwork();
  if (Number(net.chainId) !== 31337) {
    throw new Error("This script must run with --network hardhat (fork). Current chainId: " + net.chainId);
  }

  const CollateralLock = await ethers.getContractFactory("CollateralLock");
  const collateralLock = CollateralLock.attach(collateralLockAddress);

  const verificationNFTAddress = await collateralLock.verificationNFT();
  const VerificationNFT = await ethers.getContractFactory("VerificationNFT");
  const verificationNFT = VerificationNFT.attach(verificationNFTAddress);
  const minter = await verificationNFT.minter();
  const minterSet = minter !== ethers.ZeroAddress;
  const minterIsCollateralLock = minter.toLowerCase() === collateralLockAddress.toLowerCase();
  console.log("VerificationNFT:", verificationNFTAddress);
  console.log("VerificationNFT.minter set:", minterSet, "| minter === CollateralLock:", minterIsCollateralLock);
  if (!minterSet || !minterIsCollateralLock) {
    console.error("Fix: Contract owner must call VerificationNFT.setMinter(CollateralLock address).");
  }
  console.log("");

  await (provider as any).send("hardhat_impersonateAccount", [userAddress]);
  await (provider as any).send("hardhat_setBalance", [userAddress, "0x" + (1n * 10n ** 18n).toString(16)]);

  const userSigner = await provider.getSigner(userAddress);

  const wethAbi = ["function balanceOf(address) view returns (uint256)", "function allowance(address,address) view returns (uint256)"];
  const weth = new ethers.Contract(WETH_SEPOLIA, wethAbi, provider);
  const balance = await weth.balanceOf(userAddress);
  const allowance = await weth.allowance(userAddress, collateralLockAddress);
  console.log("User WETH balance:", ethers.formatEther(balance));
  console.log("User WETH allowance for CollateralLock:", ethers.formatEther(allowance));
  if (balance < amountWei) {
    console.error("Insufficient WETH balance. User has", ethers.formatEther(balance), ", needs", amountStr);
  }
  if (allowance < amountWei) {
    console.error("Insufficient allowance. User has", ethers.formatEther(allowance), ", needs", amountStr);
  }
  console.log("");

  try {
    const locked = await collateralLock.connect(userSigner).lockCollateral.staticCall(
      WETH_SEPOLIA,
      amountWei,
      loanAmountUsdWei,
      minRatioBps
    );
    console.log("SUCCESS: lockCollateral would succeed. positionId (staticCall):", locked.toString());
  } catch (err: any) {
    const msg = err?.message ?? err?.reason ?? String(err);
    const data = err?.data ?? err?.error?.data;
    console.error("REVERT (exact reason):");
    console.error(msg);
    if (data) console.error("Revert data (hex):", typeof data === "string" ? data : JSON.stringify(data));
    if (err?.shortMessage) console.error("Short message:", err.shortMessage);
    if (msg.includes("without a reason string") && !data) {
      console.error("\nHint: Revert may be from the token (e.g. WETH transferFrom). Check balance and allowance above; ensure you approved CollateralLock and have enough WETH.");
    }
    process.exit(1);
  } finally {
    await (provider as any).send("hardhat_stopImpersonatingAccount", [userAddress]);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
