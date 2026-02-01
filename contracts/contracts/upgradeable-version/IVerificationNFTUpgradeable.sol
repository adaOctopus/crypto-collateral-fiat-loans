// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IVerificationNFTUpgradeable
 * @dev Minimal interface for VerificationNFTUpgradeable - used by CollateralLockUpgradeable.
 */
interface IVerificationNFTUpgradeable {
    function mintVerificationNFT(address to, string memory tokenURI) external returns (uint256);
}
