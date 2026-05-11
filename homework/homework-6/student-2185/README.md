# Uniswap V2 and EVM-PVM Interoperability

测试全部通过，结果如下

```shell
maoqinsun@maoqindeMacBook-Air student-1924 % npx hardhat test


  EVM-PVM Interoperability
    EVM to PVM Bridge
      ✔ Should deposit funds
      ✔ Should withdraw funds
      ✔ Should reject withdrawal of more than deposited
      ✔ Should send message to PVM
    PVM to EVM Bridge
      ✔ Should receive message from PVM
      ✔ Should mark message as executed
      ✔ Should not process same message twice
    PVM Receiver
      ✔ Should receive tokens from EVM
      ✔ Should send tokens back to EVM
    Cross-Chain Swap
      ✔ Should initiate swap
      ✔ Should not allow expired swap

  MockBridgeGateway
    ✔ Should send and receive messages

  UniswapV2 Tests
    Factory
      ✔ Should create a pair
      ✔ Should not allow duplicate pairs
      ✔ Should not allow identical tokens
    Router
      ✔ Should add liquidity
      ✔ Should swap tokens correctly
      ✔ Should remove liquidity
    Token Tests
      ✔ Should transfer tokens
      ✔ Should approve and transferFrom


  20 passing (2s)
```
