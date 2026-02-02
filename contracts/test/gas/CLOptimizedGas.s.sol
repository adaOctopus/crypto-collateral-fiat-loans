// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../../contracts/CollateralLockOptimized.sol";
import "../../contracts/VerificationNFT.sol";
import "../../contracts/mocks/MockERC20.sol";

contract GasScript is Script {

    

    function run() external {

       
        //address public owner;
        address user = vm.addr(1);

        vm.startBroadcast();
        // Deploy VerificationNFT
        address owner = address(this);
        VerificationNFT verificationNFT = new VerificationNFT(owner);
        MockERC20 mockToken = new MockERC20("Test Token", "TEST", 1000000e18);
        uint256 loanAmountUSD = 15000e18; // $15,000 loan
        uint256 minCollateralRatio = 12000; // 120%

        CollateralLockOptimized c = new CollateralLockOptimized(address(verificationNFT), owner);

        vm.prank(user);
        c.lockCollateral(address(mockToken), 10e18, loanAmountUSD, minCollateralRatio);
        //mockToken.approve(address(c), 10e18);
        vm.stopBroadcast();
    }
}
