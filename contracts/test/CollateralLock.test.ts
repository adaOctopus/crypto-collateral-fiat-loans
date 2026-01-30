import { expect } from "chai";
import { ethers } from "hardhat";
import { CollateralLock } from "../typechain-types";
import { VerificationNFT } from "../typechain-types";
import { Contract } from "ethers";

describe("CollateralLock", function () {
  let collateralLock: CollateralLock;
  let verificationNFT: VerificationNFT;
  let owner: any;
  let user: any;
  let mockERC20: Contract;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20.deploy("Test Token", "TEST", ethers.parseEther("1000000"));
    await mockERC20.waitForDeployment();

    // Deploy VerificationNFT
    const VerificationNFTFactory = await ethers.getContractFactory("VerificationNFT");
    verificationNFT = await VerificationNFTFactory.deploy(owner.address) as VerificationNFT;
    await verificationNFT.waitForDeployment();

    // Deploy CollateralLock
    const CollateralLockFactory = await ethers.getContractFactory("CollateralLock");
    collateralLock = await CollateralLockFactory.deploy(
      await verificationNFT.getAddress(),
      owner.address
    ) as CollateralLock;
    await collateralLock.waitForDeployment();

    // Allow CollateralLock to mint VerificationNFT when users lock collateral
    await verificationNFT.setMinter(await collateralLock.getAddress());

    // Setup: Add token as supported and set price
    await collateralLock.setSupportedToken(await mockERC20.getAddress(), true);
    await collateralLock.setTokenPrice(await mockERC20.getAddress(), ethers.parseEther("2000")); // $2000 per token
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await collateralLock.verificationNFT()).to.equal(await verificationNFT.getAddress());
    });
  });

  describe("Token Management", function () {
    it("Should allow owner to set supported tokens", async function () {
      const newToken = await (await ethers.getContractFactory("MockERC20")).deploy("New", "NEW", ethers.parseEther("1000"));
      await newToken.waitForDeployment();
      
      await collateralLock.setSupportedToken(await newToken.getAddress(), true);
      expect(await collateralLock.supportedTokens(await newToken.getAddress())).to.be.true;
    });

    it("Should allow owner to set token prices", async function () {
      const newPrice = ethers.parseEther("3000");
      await collateralLock.setTokenPrice(await mockERC20.getAddress(), newPrice);
      expect(await collateralLock.tokenPrices(await mockERC20.getAddress())).to.equal(newPrice);
    });
  });

  describe("Collateral Locking", function () {
    it("Should lock collateral and mint NFT", async function () {
      const amount = ethers.parseEther("10");
      const loanAmountUSD = ethers.parseEther("15000"); // $15,000 loan
      
      // Approve and lock
      await mockERC20.approve(await collateralLock.getAddress(), amount);
      await collateralLock.connect(user).lockCollateral(
        await mockERC20.getAddress(),
        amount,
        loanAmountUSD,
        ethers.parseEther("12000") // 120% minimum
      );

      // Check position was created
      const positions = await collateralLock.getUserPositions(user.address);
      expect(positions.length).to.equal(1);
      expect(positions[0].amount).to.equal(amount);
      
      // Check NFT was minted
      const userTokens = await verificationNFT.getUserTokens(user.address);
      expect(userTokens.length).to.equal(1);
    });

    it("Should reject locking with insufficient collateral ratio", async function () {
      const amount = ethers.parseEther("1"); // Too little
      const loanAmountUSD = ethers.parseEther("15000");
      
      await mockERC20.approve(await collateralLock.getAddress(), amount);
      
      await expect(
        collateralLock.connect(user).lockCollateral(
          await mockERC20.getAddress(),
          amount,
          loanAmountUSD,
          ethers.parseEther("12000")
        )
      ).to.be.revertedWith("Insufficient collateral");
    });

    it("Should reject unsupported tokens", async function () {
      const unsupportedToken = await (await ethers.getContractFactory("MockERC20")).deploy("Unsupported", "UNS", ethers.parseEther("1000"));
      await unsupportedToken.waitForDeployment();
      
      await expect(
        collateralLock.connect(user).lockCollateral(
          await unsupportedToken.getAddress(),
          ethers.parseEther("10"),
          ethers.parseEther("10000"),
          ethers.parseEther("12000")
        )
      ).to.be.revertedWith("Token not supported");
    });
  });

  describe("Collateral Unlocking", function () {
    beforeEach(async function () {
      // Create a position first
      const amount = ethers.parseEther("10");
      const loanAmountUSD = ethers.parseEther("15000");
      
      await mockERC20.approve(await collateralLock.getAddress(), amount);
      await collateralLock.connect(user).lockCollateral(
        await mockERC20.getAddress(),
        amount,
        loanAmountUSD,
        ethers.parseEther("12000")
      );
    });

    it("Should unlock collateral proportionally", async function () {
      const positions = await collateralLock.getUserPositions(user.address);
      const positionId = 0; // First position
      const unlockAmount = ethers.parseEther("2");
      
      await collateralLock.connect(user).unlockCollateral(positionId, unlockAmount);
      
      const position = await collateralLock.getPosition(positionId);
      expect(position.amount).to.equal(ethers.parseEther("8"));
    });

    it("Should reject unlock that breaches minimum ratio", async function () {
      const positionId = 0;
      const unlockAmount = ethers.parseEther("8"); // Too much
      
      await expect(
        collateralLock.connect(user).unlockCollateral(positionId, unlockAmount)
      ).to.be.revertedWith("Unlock would breach ratio");
    });
  });

  describe("Liquidation", function () {
    it("Should allow liquidation when ratio falls below threshold", async function () {
      // Create position
      const amount = ethers.parseEther("10");
      const loanAmountUSD = ethers.parseEther("15000");
      
      await mockERC20.approve(await collateralLock.getAddress(), amount);
      await collateralLock.connect(user).lockCollateral(
        await mockERC20.getAddress(),
        amount,
        loanAmountUSD,
        ethers.parseEther("12000")
      );

      // Simulate price drop by updating token price
      await collateralLock.setTokenPrice(await mockERC20.getAddress(), ethers.parseEther("1000")); // Price dropped 50%
      
      // Now position should be liquidatable
      const positionId = 0;
      await collateralLock.liquidatePosition(positionId);
      
      const position = await collateralLock.getPosition(positionId);
      expect(position.isActive).to.be.false;
    });
  });
});

// Mock ERC20 for testing
const MockERC20ABI = [
  "constructor(string memory name, string memory symbol, uint256 totalSupply)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)"
];
