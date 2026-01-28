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

  // Transfer ownership of VerificationNFT to CollateralLock
  console.log("\nTransferring VerificationNFT ownership to CollateralLock...");
  await verificationNFT.transferOwnership(collateralLockAddress);
  console.log("Ownership transferred");

  // Set up initial supported tokens (example with common tokens)
  // In production, you would add actual token addresses
  console.log("\nSetup complete!");
  console.log("\n=== Deployment Summary ===");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("VerificationNFT:", verificationNFTAddress);
  console.log("CollateralLock:", collateralLockAddress);
  console.log("MockupEditor:", mockupEditorAddress);
  console.log("\nUpdate your .env files with these addresses:");
  console.log(`VERIFICATION_NFT_CONTRACT_ADDRESS=${verificationNFTAddress}`);
  console.log(`COLLATERAL_LOCK_CONTRACT_ADDRESS=${collateralLockAddress}`);
  console.log(`MOCKUP_EDITOR_CONTRACT_ADDRESS=${mockupEditorAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
