// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IAggregatorV3.sol";


// Currently we are not using Chainlink
// we have another service in the backend that fetches price from CoinGecko
// which is also not used in this version
// in this version the owner updates prices manually or via the backend chron jobn.
/**
 * @title OraclePrice
 * @dev Minimal Chainlink-based price oracle. Gas-efficient, secure, scalable.
 *      Returns prices in 18 decimals (USD per token). Use official Chainlink Data Feed addresses.
 */
contract OraclePrice is Ownable {
    /// @dev Revert when price is stale (older than this many seconds).
    uint256 public constant STALE_THRESHOLD_SEC = 1 hours;

    /// @dev Chainlink feeds return 8 decimals; we scale to 18.
    uint256 private constant DECIMAL_SCALE = 1e10;

    /// @dev ETH/USD feed (immutable = single SLOAD at read, gas efficient).
    IAggregatorV3 public immutable ethUsdFeed;
    /// @dev Token address that uses ethUsdFeed (e.g. WETH). Avoids extra mapping SLOAD for main asset.
    address public immutable wethToken;

    /// @dev Additional token => price feed. Owner can register more pairs (e.g. BTC/USD, USDC/USD).
    mapping(address => address) public priceFeeds;

    error StalePrice();
    error InvalidPrice();
    error NoFeedForToken();
    error InvalidFeed();

    event PriceFeedSet(address indexed token, address indexed feed);

/**
 * @param _ethUsdFeed Chainlink ETH/USD aggregator. Canonical: Sepolia 0x694AA1769357215DE4FAC081bf1f309aDC325306, Mainnet 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419.
     * @param _wethToken WETH (or zero address to skip). This token will use _ethUsdFeed for getPrice().
     */
    constructor(address _ethUsdFeed, address _wethToken) Ownable(msg.sender) {
        if (_ethUsdFeed == address(0)) revert InvalidFeed();
        ethUsdFeed = IAggregatorV3(_ethUsdFeed);
        wethToken = _wethToken;
        if (_wethToken != address(0)) {
            priceFeeds[_wethToken] = _ethUsdFeed;
        }
    }

    /**
     * @notice Get USD price for a token (18 decimals).
     * @param token Token address (e.g. WETH). Must have a registered feed.
     */
    function getPrice(address token) external view returns (uint256) {
        address feedAddr = token == wethToken ? address(ethUsdFeed) : priceFeeds[token];
        if (feedAddr == address(0)) revert NoFeedForToken();
        return _readPrice(IAggregatorV3(feedAddr));
    }

    /**
     * @notice Convenience: get ETH/USD price (18 decimals). Uses same feed as WETH.
     */
    function getEthPrice() external view returns (uint256) {
        return _readPrice(ethUsdFeed);
    }

    /**
     * @notice Register or update a token's price feed. Owner only.
     */
    function setPriceFeed(address token, address feed) external onlyOwner {
        
        if (feed == address(0)) revert InvalidFeed();
        priceFeeds[token] = feed;
        emit PriceFeedSet(token, feed);
    }

    function _readPrice(IAggregatorV3 feed) internal view returns (uint256) {
        (uint80 roundId, int256 answer, , uint256 updatedAt, uint80 answeredInRound) = feed.latestRoundData();
        if (answer <= 0) revert InvalidPrice();
        if (block.timestamp > updatedAt + STALE_THRESHOLD_SEC) revert StalePrice();
        if (answeredInRound != roundId) revert StalePrice(); // ensure round is complete
        // Chainlink USD feeds use 8 decimals; scale to 18.
        uint8 dec = feed.decimals();
        if (dec >= 18) return uint256(answer) * (10 ** (dec - 18));
        return uint256(answer) * (10 ** (18 - dec));
    }
}
