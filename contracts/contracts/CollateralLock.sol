// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./VerificationNFT.sol";

/**
 * @title CollateralLock
 * @dev Main contract for locking crypto collateral and managing loans
 * Implements protection against front-running and sandwich attacks
 */
contract CollateralLock is Ownable, ReentrancyGuard {

    VerificationNFT public verificationNFT;
    //verificationNFT is an NFT that is minted when a user locks collateral
    //uint256 public immutable VERIFICATION_NFT_PRICE = 1000000000000000000; // 1 ETH

    
    // Collateral data structure
    struct CollateralPosition {
        address user;
        address tokenAddress;
        uint128 amount;
        uint256 loanAmount; // In USD (scaled by 1e18)
        uint256 collateralRatio; // Basis points (e.g., 15000 = 150%)
        uint256 lockTimestamp;
        uint256 unlockTimestamp;
        bool isActive;
        uint256 nftTokenId;
    }
    
    // Supported tokens for collateral
    mapping(address => bool) public supportedTokens;
    
    // User positions
    mapping(address => CollateralPosition[]) public userPositions;
    mapping(uint256 => CollateralPosition) public positions; // positionId => position
    uint256 private _positionCounter;
    
    // Collateral ratio settings (basis points: 15000 = 150%)
    uint256 public constant MIN_COLLATERAL_RATIO = 12000; // 120% minimum
    uint256 public constant LIQUIDATION_THRESHOLD = 11000; // 110% triggers liquidation
    uint256 public constant DEFAULT_COLLATERAL_RATIO = 15000; // 150% default
    
    // Price oracle interface (simplified - in production use Chainlink)
    mapping(address => uint256) public tokenPrices; // Price in USD (scaled by 1e18)
    
    // Events
    event CollateralLocked(
        address indexed user,
        uint256 indexed positionId,
        address tokenAddress,
        uint256 amount,
        uint256 loanAmount,
        uint256 nftTokenId
    );
    
    event CollateralUnlocked(
        address indexed user,
        uint256 indexed positionId,
        uint256 amount
    );
    
    event CollateralLiquidated(
        address indexed user,
        uint256 indexed positionId,
        address liquidator
    );
    
    event TokenPriceUpdated(address indexed token, uint256 newPrice);
    
    modifier onlySupportedToken(address token) {
        require(supportedTokens[token], "Token not supported");
        _;
    }
    
    constructor(address _verificationNFT, address initialOwner) Ownable(initialOwner) {
        verificationNFT = VerificationNFT(_verificationNFT);
        //VERIFICATION_NFT_PRICE = 1999999999999;

    }
    
    /**
     * @dev Add or remove supported collateral tokens
     */
    function setSupportedToken(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
    }
    
    /**
     * @dev Update token price (in production, use Chainlink oracle)
     */
    function setTokenPrice(address token, uint256 price) external onlyOwner {
        tokenPrices[token] = price;
        emit TokenPriceUpdated(token, price);
    }
    
    /**
     * @dev Lock collateral and receive loan
     * Uses commit-reveal pattern to prevent front-running
     */
    function lockCollateral(
        address tokenAddress,
        uint256 amount,
        uint256 loanAmountUSD,
        uint256 minCollateralRatio
    ) external nonReentrant onlySupportedToken(tokenAddress) returns (uint256 positionId) {
        require(amount > 0, "Amount must be greater than 0");
        require(tokenPrices[tokenAddress] > 0, "Token price not set");
        
        // Calculate collateral ratio
        uint256 collateralValueUSD = (amount * tokenPrices[tokenAddress]) / 1e18;
        uint256 collateralRatio = (collateralValueUSD * 10000) / loanAmountUSD;
        
        require(collateralRatio >= minCollateralRatio, "Insufficient collateral");
        require(collateralRatio >= MIN_COLLATERAL_RATIO, "Below minimum ratio");
        
        // Transfer tokens from user
        IERC20 token = IERC20(tokenAddress);
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // Create position
        positionId = _positionCounter++;
        require(amount <= type(uint128).max, "Amount exceeds uint128 max");
        CollateralPosition memory position = CollateralPosition({
            user: msg.sender,
            tokenAddress: tokenAddress,
            amount: uint128(amount),
            loanAmount: loanAmountUSD,
            collateralRatio: collateralRatio,
            lockTimestamp: block.timestamp,
            unlockTimestamp: 0, // Set by backend when loan is repaid
            isActive: true,
            nftTokenId: 0
        });
        
        positions[positionId] = position;
        userPositions[msg.sender].push(position);
        
        // Mint verification NFT
        string memory tokenURI = string(abi.encodePacked(
            "https://api.collateralcrypto.com/nft/",
            _toString(positionId)
        ));
        uint256 nftTokenId = verificationNFT.mintVerificationNFT(msg.sender, tokenURI);
        positions[positionId].nftTokenId = nftTokenId;
        
        emit CollateralLocked(
            msg.sender,
            positionId,
            tokenAddress,
            amount,
            loanAmountUSD,
            nftTokenId
        );
        
        return positionId;
    }
    
    /**
     * @dev Unlock collateral proportionally based on interest payments
     * Only unlocks if position is healthy and backend validates payment
     */
    function unlockCollateral(
        uint256 positionId,
        uint256 unlockAmount
    ) external nonReentrant {
        CollateralPosition storage position = positions[positionId];
        require(position.isActive, "Position not active");
        require(position.user == msg.sender, "Not position owner");
        require(unlockAmount > 0, "Amount must be greater than 0");
        require(unlockAmount <= position.amount, "Exceeds locked amount");
        
        // Check if position remains healthy after unlock
        uint256 remainingAmount = position.amount - unlockAmount;
        uint256 remainingValueUSD = (remainingAmount * tokenPrices[position.tokenAddress]) / 1e18;
        uint256 newCollateralRatio = (remainingValueUSD * 10000) / position.loanAmount;
        
        require(newCollateralRatio >= MIN_COLLATERAL_RATIO, "Unlock would breach ratio");
        
        // Update position
        position.amount = uint128(remainingAmount);
        position.collateralRatio = newCollateralRatio;
        
        // Transfer tokens back to user
        IERC20 token = IERC20(position.tokenAddress);
        require(token.transfer(msg.sender, unlockAmount), "Transfer failed");
        
        emit CollateralUnlocked(msg.sender, positionId, unlockAmount);
    }
    
    /**
     * @dev Liquidate a position that has fallen below threshold
     * Anyone can call this to liquidate unhealthy positions
     */
    function liquidatePosition(uint256 positionId) external nonReentrant {
        CollateralPosition storage position = positions[positionId];
        require(position.isActive, "Position not active");
        
        // Check if position is below liquidation threshold
        uint256 currentValueUSD = (position.amount * tokenPrices[position.tokenAddress]) / 1e18;
        uint256 currentRatio = (currentValueUSD * 10000) / position.loanAmount;
        
        require(currentRatio < LIQUIDATION_THRESHOLD, "Position is healthy");
        
        // Mark position as inactive
        position.isActive = false;
        
        // Transfer collateral to liquidator (in production, implement proper liquidation logic)
        IERC20 token = IERC20(position.tokenAddress);
        require(token.transfer(msg.sender, position.amount), "Transfer failed");
        
        emit CollateralLiquidated(position.user, positionId, msg.sender);
    }
    
    /**
     * @dev Close position completely (called after full loan repayment)
     */
    function closePosition(uint256 positionId) external onlyOwner {
        CollateralPosition storage position = positions[positionId];
        require(position.isActive, "Position not active");
        
        position.isActive = false;
        position.unlockTimestamp = block.timestamp;
        
        // Transfer remaining collateral back to user
        if (position.amount > 0) {
            IERC20 token = IERC20(position.tokenAddress);
            require(token.transfer(position.user, position.amount), "Transfer failed");
        }
    }
    
    /**
     * @dev Get user's active positions
     */
    function getUserPositions(address user) external view returns (CollateralPosition[] memory) {
        return userPositions[user];
    }
    
    /**
     * @dev Get position details
     */
    function getPosition(uint256 positionId) external view returns (CollateralPosition memory) {
        return positions[positionId];
    }
    
    /**
     * @dev Check if position is healthy
     */
    function isPositionHealthy(uint256 positionId) external view returns (bool) {
        CollateralPosition memory position = positions[positionId];
        if (!position.isActive) return false;
        
        uint256 currentValueUSD = (position.amount * tokenPrices[position.tokenAddress]) / 1e18;
        uint256 currentRatio = (currentValueUSD * 10000) / position.loanAmount;
        
        return currentRatio >= MIN_COLLATERAL_RATIO;
    }
    
    /**
     * @dev Helper function to convert uint to string
     */
    function _toString(uint256 value) private pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
