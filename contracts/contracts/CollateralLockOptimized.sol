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
contract CollateralLockOptimized is Ownable, ReentrancyGuard {

    VerificationNFT public immutable verificationNFT;
    //verificationNFT is an NFT that is minted when a user locks collateral
    //uint256 public immutable VERIFICATION_NFT_PRICE = 1000000000000000000; // 1 ETH

    
    // Collateral data structure (packed for fewer storage slots)
    struct CollateralPosition {
        address user;
        address tokenAddress;
        uint128 amount;
        uint128 collateralRatio; // Basis points (e.g., 15000 = 150%) - fits uint128
        uint256 loanAmount;      // In USD (scaled by 1e18)
        uint64 lockTimestamp;
        uint64 unlockTimestamp;
        bool isActive;
        uint256 nftTokenId;
    }
    
    // Supported tokens for collateral
    mapping(address => bool) public supportedTokens;
    mapping(address => uint256[]) public userPositionIds;
    
    mapping(uint256 => CollateralPosition) public positions; // positionId => position
    uint256 private _positionCounter;
    
    // Collateral ratio settings (basis points: 15000 = 150%)
    uint256 public constant MIN_COLLATERAL_RATIO = 12000; // 120% minimum
    uint256 public constant LIQUIDATION_THRESHOLD = 11000; // 110% triggers liquidation
    uint256 public constant DEFAULT_COLLATERAL_RATIO = 15000; // 150% default

    //mapping(uint256 => bool) public usedNonces;
    
    // Price oracle interface (simplified - in production we use Chainlink)
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
     * @dev Add or remove supported collateral tokens.
     * When enabling, verifies the address behaves like ERC20 (has code and responds to balanceOf).
     */
    function setSupportedToken(address token, bool supported) external onlyOwner {
        if (supported) {
            require(_isERC20Like(token), "Address is not ERC20-like");
        }
        supportedTokens[token] = supported;
        //usedNonces[uint256(uint160(token))] = false; // reset nonce for token
    }

    /**
     * @dev Check if an address behaves like ERC20 (contract with balanceOf(address) returning uint256).
     * Rejects EOAs and contracts that don't implement balanceOf.
     */
    function _isERC20Like(address token) private view returns (bool) {
        if (token.code.length == 0) return false;
        (bool success, bytes memory data) = token.staticcall(
            abi.encodeWithSelector(IERC20.balanceOf.selector, address(this))
        );
        return success && data.length >= 32;
    }
    
    /**
     * @dev Update token price (in production, use Chainlink oracle)
     */
    function setTokenPrice(address token, uint256 price) external onlyOwner {
        tokenPrices[token] = price;
        emit TokenPriceUpdated(token, price);
    }

    // Dummy for foundry gas test

    function lockCollateralForGas(
    address token,
    uint256 amount,
    uint256 loanUSD,
    uint256 minRatio
        ) external {
            lockCollateral(token, amount, loanUSD, minRatio); // internal call
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
    ) public nonReentrant onlySupportedToken(tokenAddress) returns (uint256 positionId) {
        address sender = msg.sender;
        require(amount > 0, "Amount must be greater than 0");
        uint256 price = tokenPrices[tokenAddress];
        require(price > 0, "Token price not set");
        
        // Calculate collateral ratio
        uint256 collateralValueUSD = (amount * price) / 1e18;
        uint256 ratio = (collateralValueUSD * 10000) / loanAmountUSD;
        require(ratio >= minCollateralRatio, "Insufficient collateral");
        require(ratio >= MIN_COLLATERAL_RATIO, "Below minimum ratio");
        require(ratio <= type(uint128).max, "Ratio overflow");
        
        // Transfer tokens from user
        require(IERC20(tokenAddress).transferFrom(sender, address(this), amount), "Transfer failed");
        
        // Allocate position id and mint NFT first so we can write position once
        unchecked {
            positionId = _positionCounter++;
        }
        string memory tokenURI = string(abi.encodePacked(
            "https://api.collateralcrypto.com/nft/",
            _toString(positionId)
        ));
        uint256 nftTokenId = verificationNFT.mintVerificationNFT(sender, tokenURI);
        
        require(amount <= type(uint128).max, "Amount exceeds uint128 max");
        positions[positionId] = CollateralPosition({
            user: sender,
            tokenAddress: tokenAddress,
            amount: uint128(amount),
            collateralRatio: uint128(ratio),
            loanAmount: loanAmountUSD,
            lockTimestamp: uint64(block.timestamp),
            unlockTimestamp: 0,
            isActive: true,
            nftTokenId: nftTokenId
        });
        userPositionIds[sender].push(positionId);
        
        emit CollateralLocked(sender, positionId, tokenAddress, amount, loanAmountUSD, nftTokenId);
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
        uint256 newRatio = (remainingValueUSD * 10000) / position.loanAmount;
        require(newRatio >= MIN_COLLATERAL_RATIO, "Unlock would breach ratio");
        require(newRatio <= type(uint128).max, "Ratio overflow");
        
        // Update position
        position.amount = uint128(remainingAmount);
        position.collateralRatio = uint128(newRatio);
        
        // Transfer tokens back to user

        IERC20 token = IERC20(position.tokenAddress);
        
        require(token.transfer(msg.sender, unlockAmount), "Transfer failed");
        
        emit CollateralUnlocked(msg.sender, positionId, unlockAmount);
    }
    
    /**
     * @dev Liquidate a position that has fallen below threshold
     * Anyone can call this to liquidate unhealthy positions
     * Checked by the parallel worker service from express
     * like a chron job that runs every minute or so.
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
        position.unlockTimestamp = uint64(block.timestamp);
        
        // Transfer remaining collateral back to user
        if (position.amount > 0) {
            IERC20 token = IERC20(position.tokenAddress);
            require(token.transfer(position.user, position.amount), "Transfer failed");
        }
    }
    
    /**
     * @dev Get user's positions (built from ids to avoid duplicate storage)
     */
    function getUserPositions(address user) external view returns (CollateralPosition[] memory) {
        uint256[] storage ids = userPositionIds[user];
        uint256 len = ids.length;
        CollateralPosition[] memory result = new CollateralPosition[](len);
        for (uint256 i; i < len; ) {
            result[i] = positions[ids[i]];
            unchecked { ++i; }
        }
        return result;
    }

    function getUserPositionIds(address user) public view returns(uint256[] memory) {
        return userPositionIds[user];
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
