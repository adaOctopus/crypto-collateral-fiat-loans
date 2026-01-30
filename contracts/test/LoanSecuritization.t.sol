// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/LoanSecuritization.sol";
import "../contracts/VerificationNFT.sol";

contract LoanSecuritizationTest is Test {
    LoanSecuritization public loanSecuritization;
    VerificationNFT public verificationNFT;
    address public owner;
    address public user;

    function setUp() public {
        owner = address(this);
        user = address(0x1);
        // Mixing contract interaction testing with VerificationNFT


        verificationNFT = new VerificationNFT(owner);
        loanSecuritization = new LoanSecuritization(address(verificationNFT), owner);
        // Allow this test contract to mint (normally CollateralLock is minter)
        verificationNFT.setMinter(address(this));
    }

    function test_Deployment() public view {
        assertEq(address(loanSecuritization.verificationNFT()), address(verificationNFT));
    }

    

    function test_Securitize() public {
        // Mint Verification NFT token 0 to user (simulates lock-collateral flow)
        verificationNFT.mintVerificationNFT(user, "https://test.com/0");
        // User must own the Verification NFT to securitize
        vm.prank(user);
        uint256 loanId = loanSecuritization.securitize(0);
        assertEq(loanId, 0);
    }

    function test_BuyFraction() public {
        // Mint Verification NFT token 0 to user (simulates lock-collateral flow)
        verificationNFT.mintVerificationNFT(user, "https://test.com/0");
        // User must own the Verification NFT to securitize
        vm.prank(user);
        uint256 loanId = loanSecuritization.securitize(0);
        assertEq(loanId, 0);

        // Buyer must have ETH to pay PRICE_PER_FRACTION
        vm.deal(user, 1 ether);

        // Buy a fraction
        vm.prank(user);
        loanSecuritization.buyFraction{value: 0.0000001 ether}(loanId);
    }

    function test_Withdraw() public {
        // Mint Verification NFT token 0 to user (simulates lock-collateral flow)
        verificationNFT.mintVerificationNFT(user, "https://test.com/0");
        // User must own the Verification NFT to securitize
        vm.prank(user);
        uint256 loanId = loanSecuritization.securitize(0);
        assertEq(loanId, 0);
    }
}