// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title LoanSecuritizationUpgradeable
 * @dev Upgradeable version of LoanSecuritization - user brings Verification NFT; if owner, can securitize.
 * Implements UUPS proxy pattern for upgradeability.
 */
contract LoanSecuritizationUpgradeable is
    Initializable,
    ERC1155Upgradeable,
    ERC1155HolderUpgradeable,
    ERC721HolderUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    address public verificationNFT;

    uint256 public constant PRICE_PER_FRACTION = 0.0000001 ether;
    uint256 public constant FRACTIONS_PER_LOAN = 10;

    struct Loan {
        address userLoanOwner;
        address verificationNFT;
        uint256 loanId;
        uint256 verificationTokenId;
        uint256 fractionsSold;
    }

    mapping(uint256 => uint256) public fractionsSold;
    mapping(uint256 => bool) public isSecuritized;
    mapping(address => Loan[]) public loans;

    event LoanSecuritized(uint256 indexed loanId, address indexed user, uint256 verificationTokenId);
    event FractionSold(uint256 indexed loanId, address indexed buyer, uint256 fractionIndex);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _verificationNFT, address initialOwner) public initializer {
        __ERC1155_init("");
        __Ownable_init(initialOwner);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        verificationNFT = _verificationNFT;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC1155Upgradeable, ERC1155HolderUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function createLoan(
        address userLoanOwner,
        address verifierNFTUsed,
        uint256 verificationTokenId
    ) internal returns (Loan storage newLoan) {
        loans[userLoanOwner].push(
            Loan({
                userLoanOwner: userLoanOwner,
                verificationNFT: verifierNFTUsed,
                loanId: verificationTokenId,
                verificationTokenId: verificationTokenId,
                fractionsSold: 0
            })
        );
        newLoan = loans[userLoanOwner][loans[userLoanOwner].length - 1];
    }

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

        _mint(address(this), baseId, 1, "");
        for (uint256 i = 1; i <= FRACTIONS_PER_LOAN; i++) {
            _mint(address(this), baseId + i, 1, "");
        }

        createLoan(msg.sender, verificationNFT, verificationTokenId);

        emit LoanSecuritized(loanId, msg.sender, verificationTokenId);
        return loanId;
    }

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

    function getUserLoans(address user) external view returns (Loan[] memory) {
        return loans[user];
    }

    function withdraw() external onlyOwner {
        (bool ok, ) = payable(owner()).call{value: address(this).balance}("");
        require(ok, "Withdraw failed");
    }

    function getFractionTokenId(
        uint256 loanId,
        uint256 fractionIndex
    ) external pure returns (uint256) {
        require(fractionIndex < FRACTIONS_PER_LOAN, "Bad index");
        return loanId * (FRACTIONS_PER_LOAN + 1) + 1 + fractionIndex;
    }

    function fractionsAvailable(uint256 loanId) external view returns (uint256) {
        uint256 firstId = loanId * (FRACTIONS_PER_LOAN + 1) + 1;
        if (balanceOf(address(this), firstId) == 0) return 0;
        return FRACTIONS_PER_LOAN - fractionsSold[loanId];
    }
}
