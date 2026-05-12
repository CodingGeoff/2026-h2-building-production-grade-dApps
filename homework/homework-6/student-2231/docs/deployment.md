# 部署与测试过程记录

> 学号：2231  
> 时间：Homework 6 Task 1 完成记录  
> 环境：Windows / Node.js v22.15.0 / npm 10.9.2

本文档是我本地实际执行的完整过程记录，所有日志均为真实输出。

---

## 1. 环境检查

```powershell
PS> node --version
v22.15.0

PS> npm --version
10.9.2
```

满足官方要求（Node.js ≥ v22）。

---

## 2. 安装依赖

命令：
```bash
npm install
```

关键输出：
```
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. ...
npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
npm warn deprecated lodash.isequal@4.5.0: ...
added 593 packages in 32s
```

安装了 593 个包，耗时 32 秒。警告都是依赖链深处的过期提示，不影响使用。

---

## 3. 编译合约

命令：
```bash
npx hardhat compile
```

首次运行时 Hardhat 会下载 solc 0.5.16（约 14 MB），所以第一次可能失败，重试即可。

成功输出：
```
Downloading compiler 0.5.16
Generating typings for: 12 artifacts in dir: typechain-types for target: ethers-v6
Successfully generated 26 typings!
Compiled 12 Solidity files successfully (evm target: istanbul).
```

编译产物：
- `artifacts/` 里生成 12 份合约的 ABI + bytecode
- `typechain-types/` 里生成 26 个 TS 类型定义，供测试代码强类型调用

12 个 .sol 文件的分布：
- `contracts/UniswapV2ERC20.sol`, `UniswapV2Factory.sol`, `UniswapV2Pair.sol` (3)
- `contracts/interfaces/*.sol` (5)
- `contracts/libraries/*.sol` (3)
- `contracts/test/ERC20.sol` (1)

---

## 4. 运行测试

命令：
```bash
npx hardhat test
```

完整输出：
```
  UniswapV2ERC20
    ✓ name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH (65ms)
    ✓ approve
    ✓ transfer
    ✓ transfer:fail
    ✓ transferFrom
    ✓ transferFrom:max
    ✓ permit (59ms)

  UniswapV2Factory
    ✓ feeTo, feeToSetter, allPairsLength
    ✓ createPair (40ms)
    ✓ createPair:reverse (39ms)
    ✓ setFeeTo
    ✓ setFeeToSetter

  UniswapV2Pair
    ✓ mint (60ms)
    ✓ getInputPrice:0
    ✓ getInputPrice:1
    ✓ getInputPrice:2
    ✓ getInputPrice:3
    ✓ getInputPrice:4
    ✓ getInputPrice:5
    ✓ getInputPrice:6
    ✓ optimistic:0
    ✓ optimistic:1
    ✓ optimistic:2
    ✓ optimistic:3
    ✓ swap:token0
    ✓ swap:token1
    ✓ burn
    ✓ feeTo:off
    ✓ feeTo:on

  29 passing (3s)
```

### 测试数量对照

| 文件 | 测试数 | 主要覆盖 |
| ---- | ---- | ---- |
| `UniswapV2ERC20.test.ts` | 7 | ERC20 语义 + permit |
| `UniswapV2Factory.test.ts` | 5 | createPair / feeTo 权限 |
| `UniswapV2Pair.test.ts` | 17 | mint / swap × 11 / burn / feeTo |
| **合计** | **29** | 恒定乘积 AMM 全路径 |

3 秒内全部通过，无任何 flaky 用例。

---

## 5. 部署合约（本地验证）

为了确认 `scripts/deploy.ts` 能跑通，本地先跑了一遍：

命令：
```bash
npx hardhat run scripts/deploy.ts
```

输出：
```
Deploying contracts with account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
UniswapV2Factory deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
TokenA deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
TokenB deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
Pair created at: 0x1cbd7FF8268D9bEE69CD09946ea99624C558f6dC

Deployment summary:
  Factory: 0x5FbDB2315678afecb367f032d93F642f64180aa3
  TokenA: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
  TokenB: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
  Pair: 0x1cbd7FF8268D9bEE69CD09946ea99624C558f6dC
```

> 以上地址是本地 hardhat 网络的确定性账户地址（第一个 deployer 账户固定是 `0xf39F...2266`）。

部署流程：
1. Deploy `UniswapV2Factory(feeToSetter = deployer)`
2. Deploy 两份 `ERC20(totalSupply = 10000e18)` 作为 TokenA / TokenB
3. 调用 `factory.createPair(tokenA, tokenB)`，触发 CREATE2 生成 Pair 合约

---

## 6. 部署到 Polkadot Hub TestNet（计划步骤）

由于部署到测试网需要先通过 [Polkadot Faucet](https://faucet.polkadot.io/) 领取测试币，以下为完整操作步骤：

1. 配置私钥：
   ```bash
   npx hardhat vars set TESTNET_PRIVATE_KEY
   ```
2. 从 faucet 领取 TestNet 代币
3. 执行部署：
   ```bash
   npx hardhat run scripts/deploy.ts --network polkadotTestnet
   ```

`hardhat.config.ts` 里测试网配置：
```ts
polkadotTestnet: {
  url: "https://services.polkadothub-rpc.com/testnet",
  accounts: vars.has("TESTNET_PRIVATE_KEY")
    ? [vars.get("TESTNET_PRIVATE_KEY")]
    : [],
},
```

---

## 7. 遇到的问题与解决

| 问题 | 现象 | 解决 |
| ---- | ---- | ---- |
| 首次 `hardhat compile` 报错 `HH502: Couldn't download compiler version list` | 第一次运行时因网络波动无法下载编译器列表 | 重试一次即可；官方已缓存列表后不再下载 |
| npm install 警告多 | `inflight` / `glob` / `lodash.isequal` 等 deprecated | 官方依赖链引入，忽略不影响 |

整体没有修复测试的需要——29 个测试首次就全绿。这和官方教程预期一致：EVM 路径下 Uniswap V2 原版代码可以直接复用。

---

## 8. 关键文件指纹（便于助教验收）

编译后关键字节码哈希（供可能的 create2 / Router 地址推导使用）：

```
UniswapV2Pair 的 bytecode 长度：~8.5 KB
初始化代码哈希（keccak256(pair.bytecode)）：在测试里动态计算
```

测试用例 `UniswapV2Factory.test.ts > createPair` 里有一行：
```ts
const initCodeHash = keccak256(bytecode);
```
每次运行都会用当前编译产物重新计算，保证断言始终与实际部署一致。
