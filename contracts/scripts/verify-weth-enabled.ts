/**
 * Verify WETH is enabled on your CollateralLock (same .env as enable-weth).
 * Run: npx hardhat run scripts/verify-weth-enabled.ts --network sepolia
 */
import * as dotenv from "dotenv";

dotenv.config();

const WETH_SEPOLIA = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
const WETH_MAINNET = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

async function main() {
  const hre = await import("hardhat");
  const { ethers } = hre as any;
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  const collateralLockAddress = process.env.COLLATERAL_LOCK_CONTRACT_ADDRESS;
  if (!collateralLockAddress) {
    throw new Error("Missing COLLATERAL_LOCK_CONTRACT_ADDRESS in .env");
  }

  const wethAddress = chainId === 11155111 ? WETH_SEPOLIA : chainId === 1 ? WETH_MAINNET : null;
  if (!wethAddress) {
    throw new Error(`WETH not configured for chainId ${chainId}. Use --network sepolia or mainnet.`);
  }

  const CollateralLock = await ethers.getContractFactory("CollateralLock");
  const collateralLock = CollateralLock.attach(collateralLockAddress);

  const supported = await collateralLock.supportedTokens(wethAddress);
  const priceWei = await collateralLock.tokenPrices(wethAddress);
  const priceUSD = Number(ethers.formatEther(priceWei));

  console.log("Network:", network.name, "chainId:", chainId);
  console.log("CollateralLock:", collateralLockAddress);
  console.log("WETH address:", wethAddress);
  console.log("WETH supported:", supported);
  console.log("WETH price (USD, from wei):", priceUSD);
  if (!supported || priceWei === 0n) {
    console.log("\n>>> WETH is NOT enabled. Run: npx hardhat run scripts/enable-weth.ts --network sepolia");
    process.exit(1);
  }
  console.log("\n>>> WETH is enabled. If the app still reverts, ensure MetaMask is on the same network (e.g. Sepolia).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
