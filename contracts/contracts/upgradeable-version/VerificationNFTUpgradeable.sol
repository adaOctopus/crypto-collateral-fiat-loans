// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title VerificationNFTUpgradeable
 * @dev Upgradeable version of VerificationNFT - mints verification tokens when users lock collateral.
 * Implements UUPS proxy pattern for upgradeability.
 */
contract VerificationNFTUpgradeable is
    Initializable,
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    uint256 private _tokenIdCounter;
    mapping(address => uint256[]) private _userTokens;
    mapping(uint256 => address) private _tokenToUser;
    mapping(address => mapping(uint256 => uint256)) private _loanTokenTimestamps;

    struct TokenWithTimestamp {
        uint256 tokenId;
        uint256 timestamp;
    }

    address public minter;

    mapping(uint256 => uint256) private _tokenCreditScore;
    mapping(uint256 => uint256) private _tokenOnTimePayments;
    mapping(uint256 => uint256) private _tokenLatePayments;

    event NFTMinted(address indexed to, uint256 indexed tokenId, uint256 creditScore);
    event CreditScoreUpdated(uint256 indexed tokenId, uint256 newScore);
    event MinterSet(address indexed previousMinter, address indexed newMinter);
    event LoanTokenTimestampSet(address indexed user, uint256 indexed tokenId, uint256 timestamp);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        __ERC721_init("Collateral Verification", "COLL");
        __ERC721URIStorage_init();
        __Ownable_init(initialOwner);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setMinter(address _minter) external onlyOwner {
        address previous = minter;
        minter = _minter;
        emit MinterSet(previous, _minter);
    }

    function mintVerificationNFT(
        address to,
        string memory tokenURI_
    ) external nonReentrant returns (uint256) {
        require(minter != address(0), "Minter not set");
        require(msg.sender == minter, "Only minter can mint");
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        _userTokens[to].push(tokenId);
        _tokenToUser[tokenId] = to;
        _tokenCreditScore[tokenId] = 50;
        _loanTokenTimestamps[to][tokenId] = block.timestamp;
        emit LoanTokenTimestampSet(to, tokenId, block.timestamp);
        emit NFTMinted(to, tokenId, 50);
        return tokenId;
    }

    function getLoanTokenTimestamp(address user, uint256 tokenId) external view returns (uint256) {
        return _loanTokenTimestamps[user][tokenId];
    }

    function getAllTokensByUser(address user) external view returns (TokenWithTimestamp[] memory) {
        uint256[] memory tokenIds = _userTokens[user];
        TokenWithTimestamp[] memory result = new TokenWithTimestamp[](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            result[i] = TokenWithTimestamp({
                tokenId: tokenIds[i],
                timestamp: _loanTokenTimestamps[user][tokenIds[i]]
            });
        }
        return result;
    }

    function updateCreditScore(
        uint256 tokenId,
        uint256 newScore,
        bool isOnTime
    ) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(newScore <= 100, "Score exceeds maximum");

        _tokenCreditScore[tokenId] = newScore;

        if (isOnTime) {
            _tokenOnTimePayments[tokenId]++;
        } else {
            _tokenLatePayments[tokenId]++;
        }

        emit CreditScoreUpdated(tokenId, newScore);
    }

    function getCreditScore(uint256 tokenId) external view returns (uint256) {
        return _tokenCreditScore[tokenId];
    }

    function getPaymentHistory(
        uint256 tokenId
    ) external view returns (uint256 onTime, uint256 late) {
        return (_tokenOnTimePayments[tokenId], _tokenLatePayments[tokenId]);
    }

    function getUserTokens(address user) external view returns (uint256[] memory) {
        return _userTokens[user];
    }

    function getTokenUser(uint256 tokenId) external view returns (address) {
        return _tokenToUser[tokenId];
    }

    function _baseURI() internal pure override returns (string memory) {
        return "";
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
