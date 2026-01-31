/**
 * One-off script: enable WETH (and set price) on an already-deployed CollateralLock.
 * Use this if you deployed before WETH was enabled, or get "Token not supported" on lock.
 *
 * Usage (Sepolia): npx hardhat run scripts/enable-weth.ts --network sepolia
 * Usage (Mainnet): npx hardhat run scripts/enable-weth.ts --network mainnet
 *
 * Requires: COLLATERAL_LOCK_CONTRACT_ADDRESS and PRIVATE_KEY in .env (deployer must be owner).
 */
import * as dotenv from "dotenv";

dotenv.config();

const WETH_SEPOLIA = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
const WETH_MAINNET = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

async function main() {
  const hre = await import("hardhat");
  const { ethers } = hre as any;
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  const collateralLockAddress = process.env.COLLATERAL_LOCK_CONTRACT_ADDRESS;
  if (!collateralLockAddress) {
    throw new Error("Missing COLLATERAL_LOCK_CONTRACT_ADDRESS in .env");
  }

  const wethAddress = chainId === 11155111 ? WETH_SEPOLIA : chainId === 1 ? WETH_MAINNET : null;
  if (!wethAddress) {
    throw new Error(`WETH not configured for chainId ${chainId}. Run with: --network sepolia or --network mainnet`);
  }

  const CollateralLock = await ethers.getContractFactory("CollateralLock");
  const collateralLock = CollateralLock.attach(collateralLockAddress);

  const owner = await collateralLock.owner();
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`Deployer ${deployer.address} is not the contract owner (${owner}). Use the owner's private key.`);
  }

  console.log("CollateralLock:", collateralLockAddress);
  console.log("Network:", network.name, "chainId:", chainId, chainId === 11155111 ? "(Sepolia)" : chainId === 1 ? "(Mainnet)" : "");
  if (chainId !== 11155111 && chainId !== 1) {
    throw new Error("Must run on Sepolia or Mainnet. Use: npx hardhat run scripts/enable-weth.ts --network sepolia");
  }
  console.log("Enabling WETH at", wethAddress, "...");

  const tx1 = await collateralLock.setSupportedToken(wethAddress, true);
  await tx1.wait();
  console.log("setSupportedToken(WETH, true) — done");

  const ethPriceUSD = process.env.ETH_PRICE_USD || "2000";
  const ethPriceWei = ethers.parseEther(ethPriceUSD);
  const tx2 = await collateralLock.setTokenPrice(wethAddress, ethPriceWei);
  await tx2.wait();
  console.log("setTokenPrice(WETH,", ethPriceUSD, "USD) — done");

  const supported = await collateralLock.supportedTokens(wethAddress);
  const price = await collateralLock.tokenPrices(wethAddress);
  console.log("\nWETH enabled:", supported, "| price (wei):", price.toString());
  console.log("You can now lock WETH from the app.");
  console.log("If the app still reverts: 1) Run 'npx hardhat run scripts/verify-weth-enabled.ts --network sepolia' to confirm. 2) In MetaMask, switch to Sepolia so the app and contract are on the same network.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
