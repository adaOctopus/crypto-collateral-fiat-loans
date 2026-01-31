import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const hre = await import("hardhat");
  const { ethers } = hre as any;
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy VerificationNFT first
  console.log("\nDeploying VerificationNFT...");
  const VerificationNFT = await ethers.getContractFactory("VerificationNFT");
  const verificationNFT = await VerificationNFT.deploy(deployer.address);
  await verificationNFT.waitForDeployment();
  const verificationNFTAddress = await verificationNFT.getAddress();
  console.log("VerificationNFT deployed to:", verificationNFTAddress);

  // Deploy CollateralLock
  console.log("\nDeploying CollateralLock...");
  const CollateralLock = await ethers.getContractFactory("CollateralLock");
  const collateralLock = await CollateralLock.deploy(verificationNFTAddress, deployer.address);
  await collateralLock.waitForDeployment();
  const collateralLockAddress = await collateralLock.getAddress();
  console.log("CollateralLock deployed to:", collateralLockAddress);

  // Enable WETH as collateral so users can lock wrapped ETH (e.g. for Sepolia demo)
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const WETH_SEPOLIA = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
  const WETH_MAINNET = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const wethAddress = chainId === 11155111 ? WETH_SEPOLIA : chainId === 1 ? WETH_MAINNET : null;
  if (wethAddress) {
    console.log("\nEnabling WETH as collateral...");
    await collateralLock.setSupportedToken(wethAddress, true);
    const ethPriceUSD = process.env.ETH_PRICE_USD || "2000";
    const ethPriceWei = ethers.parseEther(ethPriceUSD);
    await collateralLock.setTokenPrice(wethAddress, ethPriceWei);
    console.log("WETH enabled at", wethAddress, "with price", ethPriceUSD, "USD");
  }

  // Allow CollateralLock to mint VerificationNFT when users lock collateral
  console.log("\nSetting VerificationNFT minter to CollateralLock...");
  await verificationNFT.setMinter(collateralLockAddress);
  console.log("Minter set");

  // Deploy LoanSecuritization (mints 1 securitization token + 10 fraction tokens per loan)
  console.log("\nDeploying LoanSecuritization...");
  const LoanSecuritization = await ethers.getContractFactory("LoanSecuritization");
  const loanSecuritization = await LoanSecuritization.deploy(verificationNFTAddress, deployer.address);
  await loanSecuritization.waitForDeployment();
  const loanSecuritizationAddress = await loanSecuritization.getAddress();
  console.log("LoanSecuritization deployed to:", loanSecuritizationAddress);

  console.log("\nSetup complete!");
  console.log("\n=== Deployment Summary ===");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("VerificationNFT:", verificationNFTAddress);
  console.log("CollateralLock:", collateralLockAddress);
  console.log("LoanSecuritization:", loanSecuritizationAddress);
  console.log("\nUpdate your .env files with these addresses:");
  console.log(`VERIFICATION_NFT_CONTRACT_ADDRESS=${verificationNFTAddress}`);
  console.log(`COLLATERAL_LOCK_CONTRACT_ADDRESS=${collateralLockAddress}`);
  console.log(`LOAN_SECURITIZATION_CONTRACT_ADDRESS=${loanSecuritizationAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
