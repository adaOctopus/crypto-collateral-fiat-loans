// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VerificationNFT
 * @dev NFT contract that mints verification tokens when users lock collateral
 * Also implements credit scoring through metadata
 */
contract VerificationNFT is ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _tokenIdCounter;
    mapping(address => uint256[]) private _userTokens;
    mapping(uint256 => address) private _tokenToUser;
    mapping(address => mapping(uint256 => uint256)) private _loanTokenTimestamps;

    /// @dev Struct for returning token id and mint timestamp together
    struct TokenWithTimestamp {
        uint256 tokenId;
        uint256 timestamp;
    }

    /// @dev Only this address (e.g. CollateralLock) can mint when users lock collateral
    address public minter;

    // Credit scoring metadata
    mapping(uint256 => uint256) private _tokenCreditScore; // 0-100 scale
    mapping(uint256 => uint256) private _tokenOnTimePayments;
    mapping(uint256 => uint256) private _tokenLatePayments;

    event NFTMinted(address indexed to, uint256 indexed tokenId, uint256 creditScore);
    event CreditScoreUpdated(uint256 indexed tokenId, uint256 newScore);
    event MinterSet(address indexed previousMinter, address indexed newMinter);
    event LoanTokenTimestampSet(address indexed user, uint256 indexed tokenId, uint256 timestamp);

    constructor(address initialOwner) ERC721("Collateral Verification", "COLL") Ownable(initialOwner) {}

    /**
     * @dev Set the contract allowed to mint (e.g. CollateralLock). Only owner.
     */
    function setMinter(address _minter) external onlyOwner {
        address previous = minter;
        minter = _minter;
        emit MinterSet(previous, _minter);
    }

    /**
     * @dev Mint a verification NFT to a user when they lock collateral.
     * Only callable by the minter (CollateralLock).
     */
    function mintVerificationNFT(
        address to,
        string memory tokenURI
    ) external nonReentrant returns (uint256) {
        require(minter != address(0), "Minter not set");
        require(msg.sender == minter, "Only minter can mint");
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        _userTokens[to].push(tokenId);
        _tokenToUser[tokenId] = to;
        _tokenCreditScore[tokenId] = 50; // Initial score
        // Setting timestamp when user locks collateral
        _loanTokenTimestamps[to][tokenId] = block.timestamp;
        emit LoanTokenTimestampSet(to, tokenId, block.timestamp);
        emit NFTMinted(to, tokenId, 50);
        return tokenId;
    }

    /**
     * @dev Get the timestamp when user locked collateral for a token
     */
    function getLoanTokenTimestamp(address user, uint256 tokenId) external view returns (uint256) {
        return _loanTokenTimestamps[user][tokenId];
    }

    /**
     * @dev Get all tokens for a user with their mint timestamps as a list of { tokenId, timestamp }
     */
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


    /**
     * @dev Update credit score for a token (called by backend via owner)
     */
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
    
    /**
     * @dev Get credit score for a token
     */
    function getCreditScore(uint256 tokenId) external view returns (uint256) {
        return _tokenCreditScore[tokenId];
    }
    
    /**
     * @dev Get payment history for a token
     */
    function getPaymentHistory(uint256 tokenId) external view returns (
        uint256 onTime,
        uint256 late
    ) {
        return (_tokenOnTimePayments[tokenId], _tokenLatePayments[tokenId]);
    }
    
    /**
     * @dev Get all tokens owned by a user
     */
    function getUserTokens(address user) external view returns (uint256[] memory) {
        return _userTokens[user];
    }
    
    /**
     * @dev Get user address for a token
     */
    function getTokenUser(uint256 tokenId) external view returns (address) {
        return _tokenToUser[tokenId];
    }
}
