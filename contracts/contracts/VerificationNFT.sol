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
    
    // Credit scoring metadata
    mapping(uint256 => uint256) private _tokenCreditScore; // 0-100 scale
    mapping(uint256 => uint256) private _tokenOnTimePayments;
    mapping(uint256 => uint256) private _tokenLatePayments;
    
    event NFTMinted(address indexed to, uint256 indexed tokenId, uint256 creditScore);
    event CreditScoreUpdated(uint256 indexed tokenId, uint256 newScore);
    
    constructor(address initialOwner) ERC721("Collateral Verification", "COLL") Ownable(initialOwner) {}
    
    /**
     * @dev Mint a verification NFT to a user
     * Only callable by the CollateralLock contract
     */
    function mintVerificationNFT(
        address to,
        string memory tokenURI
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        _userTokens[to].push(tokenId);
        _tokenToUser[tokenId] = to;
        _tokenCreditScore[tokenId] = 50; // Initial score
        
        emit NFTMinted(to, tokenId, 50);
        return tokenId;
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
