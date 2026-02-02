// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../contracts/CollateralLockOptimized.sol";
import "../../contracts/VerificationNFT.sol";
import "../../contracts/mocks/MockERC20.sol";

contract GasTest is Test {
    uint256 public constant TOKEN_PRICE = 2000e18;

    function testLockCollateralGas() public {
        address owner = address(this);
        address user = address(0x1);
        VerificationNFT nft = new VerificationNFT(owner);
        MockERC20 token = new MockERC20("Test Token", "TEST", 1_000_000e18);
        CollateralLockOptimized c = new CollateralLockOptimized(address(nft), owner);
        nft.setMinter(address(c)); // allow collateral contract to mint verification NFTs
        c.setSupportedToken(address(token), true);
        c.setTokenPrice(address(token), TOKEN_PRICE);
        // Give user some tokens and have user approve the contract
        token.mint(user, 100e18);
        vm.prank(user);
        token.approve(address(c), 10e18);
        // Lock collateral
        vm.prank(user);
        uint256 start = gasleft();
        c.lockCollateral(address(token), 10e18, 15_000e18, 12_000);
        uint256 end = gasleft();
        uint256 gasUsed = start - end;

        console.log("========================================");
        console.log("lockCollateral GAS USED:", gasUsed);
        console.log("========================================");
    }
}
