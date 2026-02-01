// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IAggregatorV3
 * @dev Minimal Chainlink price feed interface. Use with official Chainlink Data Feeds.
 */
interface IAggregatorV3 {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}
