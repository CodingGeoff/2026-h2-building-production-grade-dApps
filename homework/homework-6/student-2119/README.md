# Homework 6 · student-2119

对应课程要求的两部分：

## 1. Uniswap V2 + 测试网部署

工程目录：`uniswap-v2-core-hardhat/`（自 `student-2249` 的可运行模板复制并扩展）。

```bash
cd uniswap-v2-core-hardhat
npm install
npm test
```

本地已通过 **39** 条测试（含 Uniswap V2 Core 全套与下方 EVM↔PVM 用例）。

部署到 Polkadot Hub EVM testnet：

1. `npx hardhat vars set TESTNET_PRIVATE_KEY`（可选再设 `TESTNET_PRIVATE_KEY_2`）
2. `npm run deploy:polkadot`

脚本 `scripts/deploy.ts` 会部署 `UniswapV2Factory`、两枚测试 ERC20，并 `createPair`。

## 2. EVM ↔ PVM 互调用示例

Solidity 示意代码：

- `contracts/EVMPVMInteroperability.sol`：`EVMToPVMBridge`（锁定余额、`bridgeFromPVM` 由 gateway 模拟中继）、`PVMBridgeReceiver`（仅 gateway 可入账）、`CrossChainSwap`（通过 `bridgeTowardsPVMAs` 从用户余额跨链锁定）。
- `contracts/mocks/MockBridgeGateway.sol`：简易网关 mock。

测试：`test/EVMPVMInteroperability.test.ts`。说明：链上无法直接执行 Polkadot **PVM**，此处 **PVM** 通过「独立账本合约 + 中继调用 `handleCrossChainMessage` / 事件」建模，符合作业「相互调用」的流程演示。

### Hardhat 调用若遇 `npm`/权限问题

可直接：

```bash
node ./node_modules/hardhat/internal/cli/cli.js test
```
