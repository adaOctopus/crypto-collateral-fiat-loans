// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/RedeemRewards.sol";

contract RedeemRewardsTest is Test {
    RedeemRewards public redeemRewards;
    address public ifaceAddress;
    address public rewardTokenAddress;

    function setUp() public {
        ifaceAddress = address(0x1);
        rewardTokenAddress = address(0x2);
        redeemRewards = new RedeemRewards(ifaceAddress, rewardTokenAddress);
    }

    function test_Deployment() public view returns (bool) {
        //assertEq(redeemRewards.ifaceSmartContract(), ifaceAddress);
        assertEq(address(redeemRewards.getRewardToken()), rewardTokenAddress);
    }

    function test_ClaimRewards() public {
        redeemRewards.claimRewards();
    }
}

