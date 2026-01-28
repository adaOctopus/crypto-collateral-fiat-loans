// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// inheritance

contract MockupEditor {
   address contractOwner;

   // important if i do address public ContractOnwer
   // what it does in the ABI is to create a public function that retturns the value of contractOnwer.

   constructor() {
    // this makes sure that the contract owner is the one who deployed the contract.
    contractOwner = msg.sender;
   }

   struct User {
    string userName;
    uint256 userAge;
    address userAddress;
   }

   // events
   // console logs
   // we specify name of event and the parameters of the event.
   // what we want to emit.
   // cool thing is to use INDEXED keyword in order to query
   // the event based on the indexed keyword. from a frontend or backend.
   event UserAdded(string userName, uint256 indexed userAge, address userAddress);

   // errors
   error UnauthorizedUser(address user);

   modifier ownerCheckTwo() {
    if (msg.sender != contractOwner) {
      revert UnauthorizedUser(msg.sender);
    }
    _;
   }

   mapping(address => User) public users;

   // FUNCTIONS THINK OF THEM AS ENDPOINTS
   // FIRST WE NEED TO DEFINE VISIBILITY (public, private, internal, external)
   // SECOND WE NEED TO DEFINE THE TYPE OF THE FUNCTION (view, pure, payable)
   // view: means that the function will not modify the state of the contract
   // pure: means that the function will not read or write to the state of the contract
   // payable: means that the function will receive ether
    // if you are accessing state from your contract you need to use view
    // otherwise you need to use pure
   function getUsers(address _userAddress) public view returns (User memory) {
    // what return does is
    // User memory user = users[_userAddress];
    return users[_userAddress];
   }
   // why we use memory word in return?


    // here we dont need to access the state.
   function addNumbers(uint256 _a, uint256 _b) public pure returns (uint256) {
    return _a + _b;
   }

  // modifier is a way to reuse code.
  // instead of doing require() statements all the time we can use modifiers.
  modifier onlyOwner() {
    require(msg.sender == contractOwner, "Only owner can call this function");
    _; // continue with the function execution.
  }

  // Payable means that the function will receive ether in order to execute the function.
   // why do we use memory word in string?
  function addUser(string memory _userName, uint256 _userAge, address _userAddress) public onlyOwner {
    // or we can do 
    // require(msg.sender == contractOwner, "Only owner can call this function");
    users[_userAddress] = User(_userName, _userAge, _userAddress);
    emit UserAdded(_userName, _userAge, _userAddress);
  }

  function checkOwner() public view returns (bool) {
    User memory user = users[msg.sender];
    // user is a local variable that is stored in the memory.
    // we can use block.timestamp to get the current timestamp.
    // we can use msg.
    if (user.userAddress == contractOwner) {
      return true;
    }
    return false;
      }

   function returnOwner() public view returns (address) {
    return contractOwner;
   } 

   error UserNotFound(string userName);

//    function getUserByUserName(string memory _userName) public view returns (User memory) {
//     for (uint256 i = 0; i < 10; i++) {
//       if (keccak256(bytes(users[msg.sender][i].userName)) == keccak256(bytes(_userName))) {
//         return users[i];
//       }
//     }
//     revert UserNotFound(_userName);
//    }
}