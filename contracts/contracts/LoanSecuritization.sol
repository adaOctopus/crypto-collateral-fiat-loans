// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LoanSecuritization
 * @dev ERC1155: one loan token + 10 fraction tokens per securitized loan.
 * User proves ownership of Verification NFT, then we mint 1 loan cert (held here) + 10 sellable fractions.
 * Anyone can buy a fraction for a fixed price; fraction holders get interest share (logic elsewhere).
 */
contract LoanSecuritization is ERC1155, Ownable, ReentrancyGuard {
    address public immutable verificationNFT;

    uint256 public loanCounter;
    uint256 public constant PRICE_PER_FRACTION = 0.0000001 ether;
    uint256 public constant FRACTIONS_PER_LOAN = 10;

    mapping(uint256 => uint256) public fractionsSold; // loanId => count sold (0..10)
    mapping(bytes32 => bool) public usedVerification;   // keccak256(nftContract, tokenId) => used

    event LoanSecuritized(uint256 indexed loanId, address indexed user, uint256 verificationTokenId);
    event FractionSold(uint256 indexed loanId, address indexed buyer, uint256 fractionIndex);

    constructor(address _verificationNFT, address initialOwner)
        ERC1155("")
        Ownable(initialOwner)
    {
        verificationNFT = _verificationNFT;
    }

    /**
     * @dev Securitize: caller must own Verification NFT (tokenId). Mints 1 loan token + 10 fractions to this contract.
     */
    function securitize(uint256 verificationTokenId) external nonReentrant returns (uint256 loanId) {
        require(
            IERC721(verificationNFT).ownerOf(verificationTokenId) == msg.sender,
            "Not verification NFT owner"
        );
        bytes32 key = keccak256(abi.encodePacked(verificationNFT, verificationTokenId));
        require(!usedVerification[key], "Already securitized");
        usedVerification[key] = true;

        loanId = loanCounter++;
        uint256 baseId = loanId * (FRACTIONS_PER_LOAN + 1); // +1 for loan cert

        _mint(address(this), baseId, 1, ""); // loan cert stays in contract
        for (uint256 i = 1; i <= FRACTIONS_PER_LOAN; i++) {
            _mint(address(this), baseId + i, 1, "");
        }

        emit LoanSecuritized(loanId, msg.sender, verificationTokenId);
        return loanId;
    }

    /**
     * @dev Buy one fraction of a loan. Pays PRICE_PER_FRACTION; receives 1 fraction token.
     */
    function buyFraction(uint256 loanId) external payable nonReentrant {
        require(msg.value == PRICE_PER_FRACTION, "Wrong price");
        require(loanId < loanCounter, "Invalid loan");
        require(fractionsSold[loanId] < FRACTIONS_PER_LOAN, "Sold out");

        uint256 fractionIndex = fractionsSold[loanId];
        fractionsSold[loanId]++;
        uint256 tokenId = loanId * (FRACTIONS_PER_LOAN + 1) + 1 + fractionIndex;

        _safeTransferFrom(address(this), msg.sender, tokenId, 1, ""); // contract holds tokens; internal transfer

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
        if (loanId >= loanCounter) return 0;
        return FRACTIONS_PER_LOAN - fractionsSold[loanId];
    }
}

interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
}
