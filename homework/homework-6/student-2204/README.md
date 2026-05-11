# Uniswap V2 Deployment & EVM-PVM Interoperability

This project demonstrates:
1. **Uniswap V2 deployment on testnet** with comprehensive testing
2. **EVM-PVM interoperability example** for cross-chain communication

## Project Structure

```
├── contracts/
│   ├── TestToken.sol                  # Simple ERC20 token for testing
│   ├── UniswapV2Factory.sol          # Uniswap V2 factory contract
│   ├── UniswapV2Pair.sol             # Uniswap V2 pair contract
│   ├── UniswapV2Router.sol           # Uniswap V2 router for convenient swaps
│   ├── EVMPVMInteroperability.sol    # EVM-PVM bridge contracts
│   ├── interfaces/                    # Contract interfaces
│   ├── libraries/                     # Math and utility libraries
│   └── mocks/                         # Mock contracts for testing
├── test/
│   ├── UniswapV2.test.js            # Uniswap V2 tests
│   └── EVMPVMInteroperability.test.js # EVM-PVM tests
├── scripts/
│   └── deploy.js                     # Deployment script
├── hardhat.config.js                 # Hardhat configuration
└── package.json                      # Project dependencies
```

## Installation

```bash
npm install
```

## Compilation

```bash
npx hardhat compile
```

## Running Tests

### Run all tests
```bash
npx hardhat test
```

### Run specific test file
```bash
npx hardhat test test/UniswapV2.test.js
npx hardhat test test/EVMPVMInteroperability.test.js
```

### Run with detailed output
```bash
npx hardhat test --verbose
```

## Deployment

### Deploy to localhost (Hardhat Node)
```bash
# Terminal 1: Start local node
npx hardhat node

# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy.js --network localhost
```

# Uniswap V2 Deployment Guide

## Prerequisites

1. Node.js (v18 or higher)
2. npm or yarn
3. A Sepolia testnet account with ETH
4. Your private key (keep this secure!)

## Configuration

1. **Edit the .env file**:
   ```bash
   nano .env
   ```

2. **Replace the placeholder values**:
   ```env
   # Network Configuration
   SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
   MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com

   # Private Key (do not commit this file!)
   PRIVATE_KEY=your_actual_private_key_here

   # Etherscan API Key for contract verification
   ETHERSCAN_API_KEY=your_etherscan_api_key
   ```

## Deployment

### Deploy to Sepolia Testnet

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### Deploy to Mumbai Testnet

```bash
npx hardhat run scripts/deploy.js --network mumbai
```

## Testing

```bash
npx hardhat test
```

## Important Notes

- **Never commit your .env file** to version control
- **Never share your private key** with anyone
- **Always test on testnets first** before deploying to mainnet
- Make sure your account has enough testnet ETH for deployment fees

## Troubleshooting

### "Insufficient funds for gas"
- Make sure your account has enough testnet ETH
- You can get Sepolia ETH from a faucet like https://sepoliafaucet.com/

### "Private key too short"
- Make sure your private key is 64 hex characters long
- Check that you didn't include the `0x` prefix (Hardhat automatically handles this)

### "Contract deployment failed"
- Check the gas price and gas limit in your configuration
- Try increasing the gas limit if transactions are failing

## Contract Descriptions

### Uniswap V2 Contracts

1. **UniswapV2Factory.sol**
   - Creates trading pairs between any two tokens
   - Manages fee settings
   - Enables protocol governance

2. **UniswapV2Pair.sol**
   - Core exchange contract for each token pair
   - Implements Constant Product Market Maker (x*y=k)
   - Supports liquidity provisioning and token swaps
   - Calculates pricing with 0.3% fee

3. **UniswapV2Router.sol**
   - Convenient interface for common operations
   - Add/remove liquidity
   - Single-hop and multi-hop swaps
   - Price calculation utilities

### EVM-PVM Interoperability Contracts

1. **EVMToPVMBridge.sol**
   - Locks tokens on EVM chain
   - Sends cross-chain messages to PVM
   - Receives unlocked tokens from PVM

2. **PVMBridgeReceiver.sol**
   - Receives messages from EVM
   - Mints corresponding tokens on PVM
   - Sends tokens back to EVM

3. **CrossChainSwap.sol**
   - Enables atomic swaps across EVM and PVM
   - Initiates swap on EVM
   - Completes swap on PVM
   - Returns result to EVM

## Usage Examples

### Adding Liquidity to Uniswap V2

```javascript
// Approve tokens
await tokenA.approve(router.address, amountA);
await tokenB.approve(router.address, amountB);

// Add liquidity
const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
const result = await router.addLiquidity(
  tokenA.address,
  tokenB.address,
  amountA,
  amountB,
  0,  // min amount A
  0,  // min amount B
  user.address,
  deadline
);
```

### Swapping on Uniswap V2

```javascript
// Swap exact tokens for minimum output
const amountIn = ethers.parseEther("100");
const minAmountOut = ethers.parseEther("90");
const path = [tokenA.address, tokenB.address];

await tokenA.approve(router.address, amountIn);

const result = await router.swapExactTokensForTokens(
  amountIn,
  minAmountOut,
  path,
  recipient.address,
  deadline
);
```

### EVM to PVM Bridge

```javascript
// Deposit funds
await bridge.deposit(ethers.parseEther("100"));

// Bridge to PVM
const messageId = await bridge.bridgeTowardsPVM(
  pvmRecipient,
  ethers.parseEther("50"),
  "0x"
);
```

## Test Results

All tests should pass:
- ✅ Factory tests (pair creation, validation)
- ✅ Router tests (liquidity management, swaps)
- ✅ Token tests (transfers, approvals)
- ✅ EVM-PVM bridge tests (deposits, withdrawals, messages)
- ✅ Cross-chain swap tests (initiation, completion)

## Common Issues & Fixes

### Issue: Insufficient liquidity
**Cause**: Pair doesn't have enough reserves
**Fix**: Add liquidity before attempting swaps

### Issue: Swap expired
**Cause**: Deadline has passed
**Fix**: Increase deadline or reduce delays

### Issue: K constant violated
**Cause**: Insufficient output amount or fee calculation error
**Fix**: Check the minimum output amount is reasonable

### Issue: Access control errors
**Cause**: Only bridge gateway can call certain functions
**Fix**: Ensure bridgeFromPVM is called with proper authorization

## Security Considerations

1. **No access controls on public functions**: For testing only
2. **No reentrancy guards**: Consider adding in production
3. **Simplified bridge**: Production bridge needs more validation
4. **No fee handling**: Uniswap V2 fee logic simplified for demo

## Future Improvements

1. Add flash loan capabilities
2. Implement advanced pricing oracles
3. Add governance token (UNI-like)
4. Optimize gas consumption
5. Add multi-chain deployment support
6. Implement advanced bridge security features
7. Add liquidity mining rewards

## References

- [Uniswap V2 Documentation](https://docs.uniswap.org/protocol/V2/introduction)
- [EVM Documentation](https://ethereum.org/en/developers/docs/evm/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

## License

MIT
