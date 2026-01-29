// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFace {

    struct User {
        string userName;
        uint256 userAge;
        address userAddress;
    }
    event UserAdded(string userName, uint256 indexed userAge, address userAddress);
    error UnauthorizedUser(address user);
    // What are the functions that we need to implement in the contract?
    function addUser(string memory _userName, uint256 _userAge, address _userAddress) external;
    function getUsers(address _userAddress) external returns (User memory);
  
}