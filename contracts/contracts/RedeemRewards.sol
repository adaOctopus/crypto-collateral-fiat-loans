// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import { IFace } from "./IFace.sol";

contract RedeemRewards {
    // interface from the other contract named IFace.sol
    IFace private ifaceSmartContract;

    function claimRewards() public {
        address claimer = msg.sender;
        // remember you use the named variable of the interface for functions
        // but for nested types like structs, you nered to use IFace original.
        IFace.User memory claimerFromIface = ifaceSmartContract.getUsers(claimer);
        if ( claimerFromIface.userAddress != address(0) ) {
            revert ('User not found');
        }
        // address this is the contract address
        require(address(this).balance >= 1 ether, "Insufficient balance");

        // transfer the rewards to the claimer
        (bool success, ) = payable(claimer).call{value: 100}("");
        require(success, "Transfer failed");
    }

    constructor(address _ifaceAddress) {
        // storing the contract address at deployment
        ifaceSmartContract = IFace(_ifaceAddress);
        // constructor
    }
}