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

  console.log("\nDeploying MockupEditor...");
  const MockupEditor = await ethers.getContractFactory("MockupEditor");
  const mockupEditor = await MockupEditor.deploy();
  await mockupEditor.waitForDeployment();
  const mockupEditorAddress = await mockupEditor.getAddress();
  console.log("MockupEditor deployed to:", mockupEditorAddress);

  // Allow CollateralLock to mint VerificationNFT when users lock collateral
  console.log("\nSetting VerificationNFT minter to CollateralLock...");
  await verificationNFT.setMinter(collateralLockAddress);
  console.log("Minter set");

  // Deploy LoanSecuritization (ERC1155: loan + fraction tokens)
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
  console.log("MockupEditor:", mockupEditorAddress);
  console.log("\nUpdate your .env files with these addresses:");
  console.log(`VERIFICATION_NFT_CONTRACT_ADDRESS=${verificationNFTAddress}`);
  console.log(`COLLATERAL_LOCK_CONTRACT_ADDRESS=${collateralLockAddress}`);
  console.log(`LOAN_SECURITIZATION_CONTRACT_ADDRESS=${loanSecuritizationAddress}`);
  console.log(`MOCKUP_EDITOR_CONTRACT_ADDRESS=${mockupEditorAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
