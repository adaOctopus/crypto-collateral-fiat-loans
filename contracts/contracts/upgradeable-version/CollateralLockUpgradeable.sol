// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./IVerificationNFTUpgradeable.sol";

/**
 * @title CollateralLockUpgradeable
 * @dev Upgradeable version of CollateralLock - main contract for locking crypto collateral and managing loans.
 * Implements UUPS proxy pattern for upgradeability.
 */
contract CollateralLockUpgradeable is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    IVerificationNFTUpgradeable public verificationNFT;

    struct CollateralPosition {
        address user;
        address tokenAddress;
        uint128 amount;
        uint256 loanAmount;
        uint256 collateralRatio;
        uint256 lockTimestamp;
        uint256 unlockTimestamp;
        bool isActive;
        uint256 nftTokenId;
    }

    mapping(address => bool) public supportedTokens;

    mapping(address => CollateralPosition[]) public userPositions;
    mapping(uint256 => CollateralPosition) public positions;
    uint256 private _positionCounter;

    uint256 public constant MIN_COLLATERAL_RATIO = 12000;
    uint256 public constant LIQUIDATION_THRESHOLD = 11000;
    uint256 public constant DEFAULT_COLLATERAL_RATIO = 15000;

    mapping(address => uint256) public tokenPrices;

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

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _verificationNFT,
        address initialOwner
    ) public initializer {
        __Ownable_init(initialOwner);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        verificationNFT = IVerificationNFTUpgradeable(_verificationNFT);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setSupportedToken(address token, bool supported) external onlyOwner {
        if (supported) {
            require(_isERC20Like(token), "Address is not ERC20-like");
        }
        supportedTokens[token] = supported;
    }

    function _isERC20Like(address token) private view returns (bool) {
        if (token.code.length == 0) return false;
        (bool success, bytes memory data) = token.staticcall(
            abi.encodeWithSelector(IERC20.balanceOf.selector, address(this))
        );
        return success && data.length >= 32;
    }

    function setTokenPrice(address token, uint256 price) external onlyOwner {
        tokenPrices[token] = price;
        emit TokenPriceUpdated(token, price);
    }

    function lockCollateral(
        address tokenAddress,
        uint256 amount,
        uint256 loanAmountUSD,
        uint256 minCollateralRatio
    ) external nonReentrant onlySupportedToken(tokenAddress) returns (uint256 positionId) {
        require(amount > 0, "Amount must be greater than 0");
        require(tokenPrices[tokenAddress] > 0, "Token price not set");

        uint256 collateralValueUSD = (amount * tokenPrices[tokenAddress]) / 1e18;
        uint256 collateralRatio = (collateralValueUSD * 10000) / loanAmountUSD;

        require(collateralRatio >= minCollateralRatio, "Insufficient collateral");
        require(collateralRatio >= MIN_COLLATERAL_RATIO, "Below minimum ratio");

        IERC20 token = IERC20(tokenAddress);
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        positionId = _positionCounter++;
        require(amount <= type(uint128).max, "Amount exceeds uint128 max");
        CollateralPosition memory position = CollateralPosition({
            user: msg.sender,
            tokenAddress: tokenAddress,
            amount: uint128(amount),
            loanAmount: loanAmountUSD,
            collateralRatio: collateralRatio,
            lockTimestamp: block.timestamp,
            unlockTimestamp: 0,
            isActive: true,
            nftTokenId: 0
        });

        positions[positionId] = position;
        userPositions[msg.sender].push(position);

        string memory tokenURI = string(
            abi.encodePacked("https://api.collateralcrypto.com/nft/", _toString(positionId))
        );
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

    function unlockCollateral(
        uint256 positionId,
        uint256 unlockAmount
    ) external nonReentrant {
        CollateralPosition storage position = positions[positionId];

        require(position.isActive, "Position not active");
        require(position.user == msg.sender, "Not position owner");
        require(unlockAmount > 0, "Amount must be greater than 0");
        require(unlockAmount <= position.amount, "Exceeds locked amount");

        uint256 remainingAmount = position.amount - unlockAmount;
        uint256 remainingValueUSD = (remainingAmount * tokenPrices[position.tokenAddress]) / 1e18;
        uint256 newCollateralRatio = (remainingValueUSD * 10000) / position.loanAmount;

        require(newCollateralRatio >= MIN_COLLATERAL_RATIO, "Unlock would breach ratio");

        position.amount = uint128(remainingAmount);
        position.collateralRatio = newCollateralRatio;

        IERC20 token = IERC20(position.tokenAddress);

        require(token.transfer(msg.sender, unlockAmount), "Transfer failed");

        emit CollateralUnlocked(msg.sender, positionId, unlockAmount);
    }

    function liquidatePosition(uint256 positionId) external nonReentrant {
        CollateralPosition storage position = positions[positionId];
        require(position.isActive, "Position not active");

        uint256 currentValueUSD = (position.amount * tokenPrices[position.tokenAddress]) / 1e18;
        uint256 currentRatio = (currentValueUSD * 10000) / position.loanAmount;

        require(currentRatio < LIQUIDATION_THRESHOLD, "Position is healthy");

        position.isActive = false;

        IERC20 token = IERC20(position.tokenAddress);
        require(token.transfer(msg.sender, position.amount), "Transfer failed");

        emit CollateralLiquidated(position.user, positionId, msg.sender);
    }

    function closePosition(uint256 positionId) external onlyOwner {
        CollateralPosition storage position = positions[positionId];
        require(position.isActive, "Position not active");

        position.isActive = false;
        position.unlockTimestamp = block.timestamp;

        if (position.amount > 0) {
            IERC20 token = IERC20(position.tokenAddress);
            require(token.transfer(position.user, position.amount), "Transfer failed");
        }
    }

    function getUserPositions(address user) external view returns (CollateralPosition[] memory) {
        return userPositions[user];
    }

    function getPosition(uint256 positionId) external view returns (CollateralPosition memory) {
        return positions[positionId];
    }

    function isPositionHealthy(uint256 positionId) external view returns (bool) {
        CollateralPosition memory position = positions[positionId];
        if (!position.isActive) return false;

        uint256 currentValueUSD = (position.amount * tokenPrices[position.tokenAddress]) / 1e18;
        uint256 currentRatio = (currentValueUSD * 10000) / position.loanAmount;

        return currentRatio >= MIN_COLLATERAL_RATIO;
    }

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
