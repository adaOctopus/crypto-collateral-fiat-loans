// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/CollateralLock.sol";
import "../contracts/VerificationNFT.sol";
import "./MockERC20.sol";

contract CollateralLockTest is Test {
    CollateralLock public collateralLock;
    VerificationNFT public verificationNFT;
    MockERC20 public mockToken;
    
    address public owner;
    address public user;
    address public liquidator;
    
    uint256 public constant TOKEN_PRICE = 2000e18; // $2000 per token
    uint256 public constant INITIAL_SUPPLY = 1000000e18;

    function setUp() public {
        owner = address(this);
        user = address(0x1);
        liquidator = address(0x2);

        // Deploy VerificationNFT
        verificationNFT = new VerificationNFT(owner);

        // Deploy CollateralLock
        collateralLock = new CollateralLock(address(verificationNFT), owner);

        // Allow CollateralLock to mint VerificationNFT when users lock collateral
        verificationNFT.setMinter(address(collateralLock));

        // Deploy mock ERC20 token
        mockToken = new MockERC20("Test Token", "TEST", INITIAL_SUPPLY);

        // Setup: Add token as supported and set price
        collateralLock.setSupportedToken(address(mockToken), true);
        collateralLock.setTokenPrice(address(mockToken), TOKEN_PRICE);

        // Give user some tokens
        mockToken.mint(user, 100e18);
    }

    function test_Deployment() public {
        assertEq(address(collateralLock.verificationNFT()), address(verificationNFT));
        assertTrue(collateralLock.supportedTokens(address(mockToken)));
        assertEq(collateralLock.tokenPrices(address(mockToken)), TOKEN_PRICE);
    }

    function test_SetSupportedToken() public {
        address newToken = address(0x999);
        collateralLock.setSupportedToken(newToken, true);
        assertTrue(collateralLock.supportedTokens(newToken));

        collateralLock.setSupportedToken(newToken, false);
        assertFalse(collateralLock.supportedTokens(newToken));
    }

    function test_RevertSetSupportedTokenFromNonOwner() public {
        vm.prank(user);
        vm.expectRevert();
        collateralLock.setSupportedToken(address(mockToken), true);
    }

    function test_SetTokenPrice() public {
        uint256 newPrice = 3000e18;
        collateralLock.setTokenPrice(address(mockToken), newPrice);
        assertEq(collateralLock.tokenPrices(address(mockToken)), newPrice);
    }

    function test_LockCollateral() public {
        uint256 amount = 10e18;
        uint256 loanAmountUSD = 15000e18; // $15,000 loan
        uint256 minCollateralRatio = 12000; // 120%

        // Approve tokens
        vm.prank(user);
        mockToken.approve(address(collateralLock), amount);

        // Lock collateral
        vm.prank(user);
        uint256 positionId = collateralLock.lockCollateral(
            address(mockToken),
            amount,
            loanAmountUSD,
            minCollateralRatio
        );

        assertEq(positionId, 0);

        // Check position
        CollateralLock.CollateralPosition memory position = collateralLock.getPosition(positionId);
        assertEq(position.user, user);
        assertEq(position.tokenAddress, address(mockToken));
        assertEq(position.amount, amount);
        assertEq(position.loanAmount, loanAmountUSD);
        assertTrue(position.isActive);
        assertGt(position.collateralRatio, minCollateralRatio);

        // Check NFT was minted
        uint256[] memory tokens = verificationNFT.getUserTokens(user);
        assertEq(tokens.length, 1);
    }

    function test_RevertLockCollateralInsufficientRatio() public {
        uint256 amount = 1e18; // Too little
        uint256 loanAmountUSD = 15000e18;
        uint256 minCollateralRatio = 12000;

        vm.prank(user);
        mockToken.approve(address(collateralLock), amount);

        vm.prank(user);
        vm.expectRevert("Insufficient collateral");
        collateralLock.lockCollateral(
            address(mockToken),
            amount,
            loanAmountUSD,
            minCollateralRatio
        );
    }

    function test_RevertLockCollateralUnsupportedToken() public {
        address unsupportedToken = address(0x999);
        uint256 amount = 10e18;
        uint256 loanAmountUSD = 15000e18;

        vm.prank(user);
        vm.expectRevert("Token not supported");
        collateralLock.lockCollateral(unsupportedToken, amount, loanAmountUSD, 12000);
    }

    function test_RevertLockCollateralZeroAmount() public {
        vm.prank(user);
        vm.expectRevert("Amount must be greater than 0");
        collateralLock.lockCollateral(address(mockToken), 0, 10000e18, 12000);
    }

    function test_UnlockCollateral() public {
        // First lock collateral
        uint256 amount = 10e18;
        uint256 loanAmountUSD = 15000e18;

        vm.prank(user);
        mockToken.approve(address(collateralLock), amount);

        vm.prank(user);
        uint256 positionId = collateralLock.lockCollateral(
            address(mockToken),
            amount,
            loanAmountUSD,
            12000
        );

        // Unlock portion (1e18 is max to maintain 120% ratio)
        // With 10e18 tokens at 2000e18 price = 20000e18 USD value
        // Loan = 15000e18 USD
        // To maintain 120%: need 18000e18 USD value = 9e18 tokens
        // So max unlock = 1e18 tokens
        uint256 unlockAmount = 1e18;
        uint256 userBalanceBefore = mockToken.balanceOf(user);

        vm.prank(user);
        collateralLock.unlockCollateral(positionId, unlockAmount);

        // Check balances
        assertEq(mockToken.balanceOf(user), userBalanceBefore + unlockAmount);

        // Check position updated
        CollateralLock.CollateralPosition memory position = collateralLock.getPosition(positionId);
        assertEq(position.amount, amount - unlockAmount);
    }

    function test_RevertUnlockCollateralBreachesRatio() public {
        // Lock collateral
        uint256 amount = 10e18;
        uint256 loanAmountUSD = 15000e18;

        vm.prank(user);
        mockToken.approve(address(collateralLock), amount);

        vm.prank(user);
        uint256 positionId = collateralLock.lockCollateral(
            address(mockToken),
            amount,
            loanAmountUSD,
            12000
        );

        // Try to unlock too much
        uint256 unlockAmount = 8e18; // Too much

        vm.prank(user);
        vm.expectRevert("Unlock would breach ratio");
        collateralLock.unlockCollateral(positionId, unlockAmount);
    }

    function test_RevertUnlockCollateralNotOwner() public {
        // Lock collateral
        uint256 amount = 10e18;
        uint256 loanAmountUSD = 15000e18;

        vm.prank(user);
        mockToken.approve(address(collateralLock), amount);

        vm.prank(user);
        uint256 positionId = collateralLock.lockCollateral(
            address(mockToken),
            amount,
            loanAmountUSD,
            12000
        );

        // Try to unlock from different address
        vm.prank(liquidator);
        vm.expectRevert("Not position owner");
        collateralLock.unlockCollateral(positionId, 1e18);
    }

    function test_LiquidatePosition() public {
        // Lock collateral
        uint256 amount = 10e18;
        uint256 loanAmountUSD = 15000e18;

        vm.prank(user);
        mockToken.approve(address(collateralLock), amount);

        vm.prank(user);
        uint256 positionId = collateralLock.lockCollateral(
            address(mockToken),
            amount,
            loanAmountUSD,
            12000
        );

        // Simulate price drop by updating token price
        collateralLock.setTokenPrice(address(mockToken), 1000e18); // Price dropped 50%

        // Liquidate
        uint256 liquidatorBalanceBefore = mockToken.balanceOf(liquidator);
        vm.prank(liquidator);
        collateralLock.liquidatePosition(positionId);

        // Check liquidator received tokens
        assertEq(mockToken.balanceOf(liquidator), liquidatorBalanceBefore + amount);

        // Check position is inactive
        CollateralLock.CollateralPosition memory position = collateralLock.getPosition(positionId);
        assertFalse(position.isActive);
    }

    function test_RevertLiquidateHealthyPosition() public {
        // Lock collateral
        uint256 amount = 10e18;
        uint256 loanAmountUSD = 15000e18;

        vm.prank(user);
        mockToken.approve(address(collateralLock), amount);

        vm.prank(user);
        uint256 positionId = collateralLock.lockCollateral(
            address(mockToken),
            amount,
            loanAmountUSD,
            12000
        );

        // Try to liquidate healthy position
        vm.prank(liquidator);
        vm.expectRevert("Position is healthy");
        collateralLock.liquidatePosition(positionId);
    }

    function test_ClosePosition() public {
        // Lock collateral
        uint256 amount = 10e18;
        uint256 loanAmountUSD = 15000e18;

        vm.prank(user);
        mockToken.approve(address(collateralLock), amount);

        vm.prank(user);
        uint256 positionId = collateralLock.lockCollateral(
            address(mockToken),
            amount,
            loanAmountUSD,
            12000
        );

        // Close position
        uint256 userBalanceBefore = mockToken.balanceOf(user);
        collateralLock.closePosition(positionId);

        // Check user received tokens back
        assertEq(mockToken.balanceOf(user), userBalanceBefore + amount);

        // Check position is inactive
        CollateralLock.CollateralPosition memory position = collateralLock.getPosition(positionId);
        assertFalse(position.isActive);
    }

    function test_GetUserPositions() public {
        // Lock two positions
        uint256 amount = 10e18;
        uint256 loanAmountUSD = 15000e18;

        vm.prank(user);
        mockToken.approve(address(collateralLock), amount * 2);

        vm.prank(user);
        collateralLock.lockCollateral(address(mockToken), amount, loanAmountUSD, 12000);

        vm.prank(user);
        collateralLock.lockCollateral(address(mockToken), amount, loanAmountUSD, 12000);

        // Get positions
        CollateralLock.CollateralPosition[] memory positions = collateralLock.getUserPositions(user);
        assertEq(positions.length, 2);
    }

    function test_IsPositionHealthy() public {
        // Lock collateral
        uint256 amount = 10e18;
        uint256 loanAmountUSD = 15000e18;

        vm.prank(user);
        mockToken.approve(address(collateralLock), amount);

        vm.prank(user);
        uint256 positionId = collateralLock.lockCollateral(
            address(mockToken),
            amount,
            loanAmountUSD,
            12000
        );

        // Check health
        assertTrue(collateralLock.isPositionHealthy(positionId));

        // Drop price below threshold
        collateralLock.setTokenPrice(address(mockToken), 1000e18);
        assertFalse(collateralLock.isPositionHealthy(positionId));
    }
}
