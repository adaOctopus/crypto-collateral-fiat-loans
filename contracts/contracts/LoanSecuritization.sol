// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LoanSecuritization
 * @dev User brings Verification NFT; if owner, can securitize: mints 1 ERC721 identifier + 10 ERC1155 fractions,
 * all linked to the verification NFT. Reverts if this contract already holds ERC1155 linked to that verification.
 */

 interface ISecuritizationIdentifier {
    function mint(address to, uint256 tokenId) external;
}

contract LoanSecuritization is ERC1155, Ownable, ReentrancyGuard {
    address public verificationNFT;
    address public identifierNFT;
    address public immutable loanAssetContract;

    uint256 public constant PRICE_PER_FRACTION = 0.0000001 ether;
    uint256 public constant FRACTIONS_PER_LOAN = 10;

    struct Loan {
        address userLoanOwner;
        address verificationNFT;
        uint256 loanId;
        uint256 verificationTokenId;
        uint256 fractionsSold;
    }

    mapping(uint256 => uint256) public fractionsSold; // verificationTokenId (loanId) => count sold (0..10)
    mapping(uint256 => bool) public isSecuritized; // verificationTokenId (loanId) => true/false
    mapping(address => Loan[]) public loans;
    event LoanSecuritized(uint256 indexed loanId, address indexed user, uint256 verificationTokenId);
    event FractionSold(uint256 indexed loanId, address indexed buyer, uint256 fractionIndex);

    constructor( address initialOwner)
        ERC1155("")
        Ownable(initialOwner)
    {
        loanAssetContract = address(this);
    }

    function setIdentifierNFT(address _identifierNFT) external onlyOwner {
        identifierNFT = _identifierNFT;
    }

    /**
     * @dev Securitize: caller must own Verification NFT. 
     * Mints 1 ERC721 (identifier) to caller and 10 ERC1155 (fractions) to this contract.
     * This contract must hold the loan asset linked to this verification (same token id).
     * Reverts if this contract already holds an ERC1155 linked to this verification NFT (already securitized).
     * loanId = verificationTokenId (1:1 link).
     */
    function securitize(uint256 verificationTokenId) external nonReentrant returns (uint256 loanId) {

        require(
            IERC721(verificationNFT).ownerOf(verificationTokenId) == msg.sender,
            "Not verification NFT owner"
        );

        loanId = verificationTokenId;
        uint256 baseId = loanId * (FRACTIONS_PER_LOAN + 1);
        uint256 firstFractionId = baseId + 1;

        require(
            balanceOf(address(this), firstFractionId) == 0,
            "Already securitized"
        );

        ISecuritizationIdentifier(identifierNFT).mint(address(this), verificationTokenId);
        for (uint256 i = 1; i <= FRACTIONS_PER_LOAN; i++) {
            _mint(address(this), baseId + i, 1, "");
        }

        emit LoanSecuritized(loanId, msg.sender, verificationTokenId);
        return loanId;
    }

    /**
     * @dev Buy one fraction of a loan. Pays PRICE_PER_FRACTION; receives 1 fraction token.
     * loanId = verificationTokenId of the securitized loan.
     */
    function buyFraction(uint256 loanId) external payable nonReentrant {
        require(msg.value == PRICE_PER_FRACTION, "Wrong price");
        require(fractionsSold[loanId] < FRACTIONS_PER_LOAN, "Sold out");

        uint256 fractionIndex = fractionsSold[loanId];
        uint256 tokenId = loanId * (FRACTIONS_PER_LOAN + 1) + 1 + fractionIndex;
        require(balanceOf(address(this), tokenId) >= 1, "Invalid loan");

        fractionsSold[loanId]++;
        _safeTransferFrom(address(this), msg.sender, tokenId, 1, "");

        emit FractionSold(loanId, msg.sender, fractionIndex);
    }

    function withdraw() external onlyOwner {
        (bool ok,) = payable(owner()).call{value: address(this).balance}("");
        require(ok, "Withdraw failed");
    }

    function getFractionTokenId(uint256 loanId, uint256 fractionIndex) external pure returns (uint256) {
        require(fractionIndex < FRACTIONS_PER_LOAN, "Bad index");
        return loanId * (FRACTIONS_PER_LOAN + 1) + 1 + fractionIndex;
    }

    function fractionsAvailable(uint256 loanId) external view returns (uint256) {
        uint256 firstId = loanId * (FRACTIONS_PER_LOAN + 1) + 1;
        if (balanceOf(address(this), firstId) == 0) return 0;
        return FRACTIONS_PER_LOAN - fractionsSold[loanId];
    }
}


