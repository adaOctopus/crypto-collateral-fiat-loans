// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/MockupEditor.sol";

contract MockupEditorTest is Test {
    MockupEditor public editor;
    address public owner;
    address public user;

    function setUp() public {
        owner = address(this);
        user = address(0x1);
        editor = new MockupEditor();
    }

    function test_Deployment() public view returns (bool) {
        assertEq(editor.returnOwner(), owner);
    }

    function test_AddUser() public {
        editor.addUser("Alice", 25, user);
        MockupEditor.User memory userData = editor.getUsers(user);
        assertEq(userData.userName, "Alice");
        assertEq(userData.userAge, 25);
    }

    function test_RevertAddUserNotOwner() public {
        vm.prank(user);
        vm.expectRevert();
        editor.addUser("Bob", 30, user);
    }
}