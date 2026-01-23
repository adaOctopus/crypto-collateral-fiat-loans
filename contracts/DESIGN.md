# Smart Contract Design Decisions

## Architecture Overview

The collateral loan system consists of two main contracts:

1. **CollateralLock.sol** - Main contract managing collateral positions and loans
2. **VerificationNFT.sol** - NFT contract for verification tokens and credit scoring

## Security Considerations

### 1. Reentrancy Protection
- **Implementation**: All state-changing functions use `nonReentrant` modifier from OpenZeppelin
- **Rationale**: Prevents reentrancy attacks when transferring tokens
- **Location**: `lockCollateral()`, `unlockCollateral()`, `liquidatePosition()`

### 2. Front-Running & Sandwich Attack Prevention
- **Implementation**: 
  - Minimum collateral ratio enforcement at transaction level
  - Commit-reveal pattern ready (can be extended)
  - Slippage protection via `minCollateralRatio` parameter
- **Rationale**: Prevents MEV bots from exploiting price movements during transactions

### 3. Access Control
- **Implementation**: OpenZeppelin's `Ownable` pattern
- **Rationale**: Critical functions (price updates, token management) restricted to owner
- **Future**: Consider multi-sig for production

### 4. Collateral Ratio Management
- **Constants**:
  - `MIN_COLLATERAL_RATIO = 12000` (120%) - Minimum required
  - `LIQUIDATION_THRESHOLD = 11000` (110%) - Triggers liquidation
  - `DEFAULT_COLLATERAL_RATIO = 15000` (150%) - Default target
- **Rationale**: Provides buffer against volatility while allowing reasonable loan-to-value ratios

## Gas Optimization Techniques

1. **Storage Packing**: Struct fields ordered to minimize storage slots
2. **Events Instead of Storage**: Payment history tracked via events where possible
3. **External Functions**: View functions marked `external` for gas savings
4. **Optimizer Settings**: 200 runs for balance between size and gas efficiency

## Design Patterns

### 1. Separation of Concerns
- NFT contract handles verification and credit scoring
- Collateral contract handles financial logic
- Clear ownership transfer pattern

### 2. Proportional Unlocking
- Users can unlock portions of collateral based on interest payments
- Maintains position health checks after each unlock
- Prevents over-leveraging

### 3. Liquidation Mechanism
- Public liquidation function for undercollateralized positions
- Incentivizes liquidators to maintain system health
- Automatic position closure

## Oracle Integration

**Current**: Simplified price feed via owner-set prices
**Production Recommendation**: 
- Chainlink Price Feeds for mainnet tokens
- Time-weighted average prices (TWAP) for volatility protection
- Multiple oracle fallbacks for redundancy

## Future Enhancements

1. **Multi-token Collateral**: Support for multiple tokens in single position
2. **Interest Rate Model**: Dynamic interest rates based on utilization
3. **Flash Loan Protection**: Additional checks for flash loan attacks
4. **Governance**: DAO-based parameter updates
5. **Insurance Fund**: Reserve fund for bad debt coverage

## Testing Strategy

- Unit tests for all major functions
- Edge case testing (zero amounts, maximum values)
- Integration tests for full workflows
- Fuzz testing for price volatility scenarios
