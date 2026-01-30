import { expect } from 'chai';
import { ethers } from 'hardhat';
import { VerificationNFT } from '../typechain-types';

describe('VerificationNFT', function () {
  let verificationNFT: VerificationNFT;
  let owner: any;
  let user: any;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const VerificationNFTFactory = await ethers.getContractFactory('VerificationNFT');
    verificationNFT = await VerificationNFTFactory.deploy(owner.address) as VerificationNFT;
    await verificationNFT.waitForDeployment();
    await verificationNFT.setMinter(owner.address);
  });

  describe('Deployment', function () {
    it('Should deploy with correct name and symbol', async function () {
      expect(await verificationNFT.name()).to.equal('Collateral Verification');
      expect(await verificationNFT.symbol()).to.equal('COLL');
    });
  });

  describe('Minting', function () {
    it('Should allow minter to mint NFT', async function () {
      const tokenURI = 'https://api.example.com/nft/1';
      const tx = await verificationNFT.mintVerificationNFT(user.address, tokenURI);
      await tx.wait();

      expect(await verificationNFT.balanceOf(user.address)).to.equal(1);
      expect(await verificationNFT.tokenURI(0)).to.equal(tokenURI);
    });

    it('Should reject minting from non-minter', async function () {
      await expect(
        verificationNFT.connect(user).mintVerificationNFT(user.address, 'uri')
      ).to.be.revertedWith('Only minter can mint');
    });
  });

  describe('Credit Scoring', function () {
    beforeEach(async function () {
      await verificationNFT.mintVerificationNFT(user.address, 'uri');
    });

    it('Should initialize with default credit score', async function () {
      expect(await verificationNFT.getCreditScore(0)).to.equal(50);
    });

    it('Should allow owner to update credit score', async function () {
      await verificationNFT.updateCreditScore(0, 75, true);
      expect(await verificationNFT.getCreditScore(0)).to.equal(75);
    });

    it('Should track payment history', async function () {
      await verificationNFT.updateCreditScore(0, 60, true);
      const [onTime, late] = await verificationNFT.getPaymentHistory(0);
      expect(onTime).to.equal(1);
      expect(late).to.equal(0);
    });
  });
});
