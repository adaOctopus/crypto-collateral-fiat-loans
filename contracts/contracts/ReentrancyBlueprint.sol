// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import { ReentrancyGuard } from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

contract ReentrancyBlueprint is ReentrancyGuard {
  
  mapping(address => uint256) public balances;

  event Withdrawal(address indexed user, uint256 amount);

  function deposit() public payable {
    balances[msg.sender] += msg.value;
  }

  // key in CEI pattern is to check and update state before external calls
    // nonReentrant is a modifier from OpenZeppelin's ReentrancyGuard contract
    // it checks if the function is already being called and if so, it reverts
  function withdrawWithReentrancy() external nonReentrant {
    uint256 balance = balances[msg.sender];
    balances[msg.sender] = 0;
    (bool success, ) = payable(msg.sender).call{value: balance}("");
    require(success, "Transfer failed");
    emit Withdrawal(msg.sender, balance);
  }
}