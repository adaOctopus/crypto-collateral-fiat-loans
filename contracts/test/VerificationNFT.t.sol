// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/VerificationNFT.sol";

contract VerificationNFTTest is Test {
    VerificationNFT public nft;
    address public owner;
    address public user;

    function setUp() public {
        owner = address(this);
        user = address(0x1);
        nft = new VerificationNFT(owner);
        nft.setMinter(owner); // test contract is minter so it can call mintVerificationNFT
    }

    function test_Deployment() public {
        assertEq(nft.name(), "Collateral Verification");
        assertEq(nft.symbol(), "COLL");
        assertEq(nft.owner(), owner);
    }

    function test_MintNFT() public {
        string memory tokenURI = "https://api.example.com/nft/0";
        uint256 tokenId = nft.mintVerificationNFT(user, tokenURI);

        assertEq(tokenId, 0);
        assertEq(nft.ownerOf(tokenId), user);
        assertEq(nft.tokenURI(tokenId), tokenURI);
        assertEq(nft.balanceOf(user), 1);
    }

    function test_InitialCreditScore() public {
        string memory tokenURI = "https://api.example.com/nft/0";
        uint256 tokenId = nft.mintVerificationNFT(user, tokenURI);

        assertEq(nft.getCreditScore(tokenId), 50);
    }

    function test_UpdateCreditScore() public {
        string memory tokenURI = "https://api.example.com/nft/0";
        uint256 tokenId = nft.mintVerificationNFT(user, tokenURI);

        nft.updateCreditScore(tokenId, 75, true);
        assertEq(nft.getCreditScore(tokenId), 75);

        (uint256 onTime, uint256 late) = nft.getPaymentHistory(tokenId);
        assertEq(onTime, 1);
        assertEq(late, 0);
    }

    function test_UpdateCreditScoreLate() public {
        string memory tokenURI = "https://api.example.com/nft/0";
        uint256 tokenId = nft.mintVerificationNFT(user, tokenURI);

        nft.updateCreditScore(tokenId, 40, false);
        assertEq(nft.getCreditScore(tokenId), 40);

        (uint256 onTime, uint256 late) = nft.getPaymentHistory(tokenId);
        assertEq(onTime, 0);
        assertEq(late, 1);
    }

    function test_RevertUpdateCreditScoreExceedsMax() public {
        string memory tokenURI = "https://api.example.com/nft/0";
        uint256 tokenId = nft.mintVerificationNFT(user, tokenURI);

        vm.expectRevert("Score exceeds maximum");
        nft.updateCreditScore(tokenId, 101, true);
    }

    function test_RevertUpdateCreditScoreNonExistent() public {
        vm.expectRevert();
        nft.updateCreditScore(999, 75, true);
    }

    function test_GetUserTokens() public {
        string memory tokenURI1 = "https://api.example.com/nft/0";
        string memory tokenURI2 = "https://api.example.com/nft/1";

        uint256 tokenId1 = nft.mintVerificationNFT(user, tokenURI1);
        uint256 tokenId2 = nft.mintVerificationNFT(user, tokenURI2);

        uint256[] memory tokens = nft.getUserTokens(user);
        assertEq(tokens.length, 2);
        assertEq(tokens[0], tokenId1);
        assertEq(tokens[1], tokenId2);
    }

    function test_GetTokenUser() public {
        string memory tokenURI = "https://api.example.com/nft/0";
        uint256 tokenId = nft.mintVerificationNFT(user, tokenURI);

        assertEq(nft.getTokenUser(tokenId), user);
    }

    function test_RevertMintFromNonOwner() public {
        vm.prank(address(0x999));
        vm.expectRevert();
        nft.mintVerificationNFT(user, "uri");
    }

    function test_GetLoanTokenTimestamp() public {
        string memory tokenURI = "https://api.example.com/nft/0";
        uint256 tokenId = nft.mintVerificationNFT(user, tokenURI);

        assertEq(nft.getLoanTokenTimestamp(user, tokenId), block.timestamp);
    }

    function test_GetAllTokensByUser() public {
        string memory tokenURI1 = "https://api.example.com/nft/0";
        string memory tokenURI2 = "https://api.example.com/nft/1";

        uint256 tokenId1 = nft.mintVerificationNFT(user, tokenURI1);
        uint256 tokenId2 = nft.mintVerificationNFT(user, tokenURI2);

        VerificationNFT.TokenWithTimestamp[] memory tokens = nft.getAllTokensByUser(user);
        assertEq(tokens.length, 2);
        assertEq(tokens[0].tokenId, tokenId1);
        assertEq(tokens[0].timestamp, block.timestamp);
        assertEq(tokens[1].tokenId, tokenId2);
        assertEq(tokens[1].timestamp, block.timestamp);
    }

}