// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import { IFace } from "./IFace.sol";
import { IERC20 } from "./IERC20.sol";
import { MockupEditor } from "./MockupEditor.sol";

// inheritance works from the right as higher priority
// i.e MockupEditor, Iface means Iface has higher priority than MockupEditor
contract RedeemRewards is MockupEditor {
    // interface from the other contract named IFace.sol
    IFace private ifaceSmartContract;
    IERC20 private rewardToken;

       constructor(address _ifaceAddress, address _rewardTokenAddress) {
        // storing the contract address at deployment
        ifaceSmartContract = IFace(_ifaceAddress);
        // constructor
        rewardToken = IERC20(_rewardTokenAddress);
    }

    function getRewardToken() external view returns (IERC20) {
        return rewardToken;
    }

    function claimRewards() public {
        address claimer = msg.sender;
        // remember you use the named variable of the interface for functions
        // but for nested types like structs, you nered to use IFace original.
        IFace.User memory claimerFromIface = ifaceSmartContract.getUsers(claimer);
        if ( claimerFromIface.userAddress == address(0) ) {
            revert ('User not found');
        }
        // address this is the contract address
        require(address(this).balance >= 1 ether, "Insufficient balance");

        // transfer the rewards to the claimer
        (bool success, ) = payable(claimer).call{value: 100}("");
        require(success, "Transfer failed");

        // check if 
        require(rewardToken.balanceOf(address(this)) >= 1 ether, "Insufficient balance of ERC20");

        (bool ok,) = payable(claimer).call{value: rewardToken.balanceOf(address(this))}("");
        require(ok, "Transfer failed");
    }

    // lets say i wnat to oveerride getUsers function from MockupEditor
    function getUsers(address userAddress) override(MockupEditor) public view returns (User memory) {
        return super.getUsers(userAddress);
    }

 
}