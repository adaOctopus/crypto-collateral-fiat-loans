// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../../contracts/CollateralLockOptimized.sol";
import "../../contracts/VerificationNFT.sol";
import "../../contracts/mocks/MockERC20.sol";

contract GasScript is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy contracts
        address owner = address(this);
        VerificationNFT verificationNFT = new VerificationNFT(owner);
        MockERC20 mockToken = new MockERC20("Test Token", "TEST", 1000000e18);

        uint256 loanAmountUSD = 15000e18; // $15,000 loan
        uint256 minCollateralRatio = 12000; // 120%

        CollateralLockOptimized c = new CollateralLockOptimized(address(verificationNFT), owner);

        // Call function you want to measure
        c.lockCollateralForGas(address(mockToken), 10e18, loanAmountUSD, minCollateralRatio);

        vm.stopBroadcast();
    }
}
