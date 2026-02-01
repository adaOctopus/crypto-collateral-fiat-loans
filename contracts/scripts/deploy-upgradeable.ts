/**
 * Deploy script for upgradeable versions of VerificationNFT, CollateralLock, and LoanSecuritization.
 * Uses UUPS proxy pattern via OpenZeppelin upgrades plugin.
 *
 * Note: Upgradeable contracts require Solidity ^0.8.22 (OZ 5.4). Compile with Foundry first:
 *   forge build
 * Then run this script (Hardhat may need Solidity 0.8.24 compiler - add to hardhat.config if needed):
 *   npx hardhat run scripts/deploy-upgradeable.ts --network <network>
 */
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const hre = await import("hardhat");
  const { ethers, upgrades } = hre as any;
  const [deployer] = await ethers.getSigners();

  console.log("Deploying upgradeable contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );

  // 1. Deploy VerificationNFTUpgradeable (proxy)
  console.log("\nDeploying VerificationNFTUpgradeable (UUPS proxy)...");
  const VerificationNFTUpgradeable = await ethers.getContractFactory(
    "VerificationNFTUpgradeable"
  );
  const verificationNFT = await upgrades.deployProxy(
    VerificationNFTUpgradeable,
    [deployer.address],
    { kind: "uups" }
  );
  await verificationNFT.waitForDeployment();
  const verificationNFTAddress = await verificationNFT.getAddress();
  console.log("VerificationNFTUpgradeable proxy:", verificationNFTAddress);

  // 2. Deploy CollateralLockUpgradeable (proxy)
  console.log("\nDeploying CollateralLockUpgradeable (UUPS proxy)...");
  const CollateralLockUpgradeable = await ethers.getContractFactory(
    "CollateralLockUpgradeable"
  );
  const collateralLock = await upgrades.deployProxy(
    CollateralLockUpgradeable,
    [verificationNFTAddress, deployer.address],
    { kind: "uups" }
  );
  await collateralLock.waitForDeployment();
  const collateralLockAddress = await collateralLock.getAddress();
  console.log("CollateralLockUpgradeable proxy:", collateralLockAddress);

  // 3. Set minter on VerificationNFT
  console.log("\nSetting VerificationNFT minter to CollateralLock...");
  await verificationNFT.setMinter(collateralLockAddress);
  console.log("Minter set");

  // 4. Deploy LoanSecuritizationUpgradeable (proxy)
  console.log("\nDeploying LoanSecuritizationUpgradeable (UUPS proxy)...");
  const LoanSecuritizationUpgradeable = await ethers.getContractFactory(
    "LoanSecuritizationUpgradeable"
  );
  const loanSecuritization = await upgrades.deployProxy(
    LoanSecuritizationUpgradeable,
    [verificationNFTAddress, deployer.address],
    { kind: "uups" }
  );
  await loanSecuritization.waitForDeployment();
  const loanSecuritizationAddress = await loanSecuritization.getAddress();
  console.log("LoanSecuritizationUpgradeable proxy:", loanSecuritizationAddress);

  // 5. Optional: Enable WETH as collateral (Sepolia/Mainnet)
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const WETH_SEPOLIA = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
  const WETH_MAINNET = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const wethAddress =
    chainId === 11155111 ? WETH_SEPOLIA : chainId === 1 ? WETH_MAINNET : null;
  if (wethAddress) {
    console.log("\nEnabling WETH as collateral...");
    await collateralLock.setSupportedToken(wethAddress, true);
    const ethPriceUSD = process.env.ETH_PRICE_USD || "2000";
    const ethPriceWei = ethers.parseEther(ethPriceUSD);
    await collateralLock.setTokenPrice(wethAddress, ethPriceWei);
    console.log("WETH enabled at", wethAddress, "with price", ethPriceUSD, "USD");
  }

  console.log("\n=== Upgradeable Deployment Summary ===");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("VerificationNFTUpgradeable proxy:", verificationNFTAddress);
  console.log("CollateralLockUpgradeable proxy:", collateralLockAddress);
  console.log("LoanSecuritizationUpgradeable proxy:", loanSecuritizationAddress);
  console.log("\nUse these proxy addresses in your .env (same interface as non-upgradeable)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
