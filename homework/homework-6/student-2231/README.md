# Homework 6 - Task 1 · Deploy Uniswap V2 Core on Polkadot Hub (Student 2231)

本次作业完成 **homework-6 实践题第 1 题**：部署 Uniswap V2 Core 到测试网，并跑通所有测试用例。

> **代码来源声明**
>
> 本项目的合约源码与测试脚本基于 Polkadot 官方教程推荐的参考仓库
> [polkadot-developers/revm-hardhat-examples](https://github.com/polkadot-developers/revm-hardhat-examples)（commit `b0a8627059a9d9cb759682310219557550186bc4`）。
>
> 教程地址：[Deploy Uniswap V2 Core with EVM - Polkadot Cookbook](https://docs.polkadot.com/smart-contracts/cookbook/eth-dapps/uniswap-v2/core-v2/)。
>
> Uniswap V2 合约本身遵循 GPL-3.0 协议，属开源代码。本次作业的重点在于：**理解、部署、验证**整套流程。
> 详细的本人工作产出见：
> - [`docs/notes.md`](./docs/notes.md)：Uniswap V2 架构与 Polkadot EVM 路径学习笔记
> - [`docs/deployment.md`](./docs/deployment.md)：本人实际在本地完成的编译/测试/部署全过程记录
> - [`docs/test-report.md`](./docs/test-report.md)：29 个测试用例逐一分析

---

## 快速开始

### 前置条件

- Node.js v22+（我本地使用 v22.15.0）
- 一个有测试币的钱包（用于部署到 Polkadot Hub TestNet）
- 测试币通过 [Polkadot Faucet](https://faucet.polkadot.io/) 领取

### 1. 安装依赖

```bash
npm install
```

### 2. 编译合约

```bash
npx hardhat compile
```

预期输出：

```
Compiling 12 Solidity files
Successfully compiled 12 Solidity files
Generating typings for: 12 artifacts in dir: typechain-types for target: ethers-v6
Successfully generated 26 typings!
```

### 3. 配置私钥（部署到测试网时才需要）

```bash
npx hardhat vars set TESTNET_PRIVATE_KEY
```

Hardhat 的 vars 会把私钥存在本机用户目录下，而不是项目里，避免意外提交。

### 4. 运行测试

**默认 hardhat 网络（最快）：**

```bash
npx hardhat test
```

**本地开发节点：**（需要先启动 Polkadot [Local Development Node](https://docs.polkadot.com/smart-contracts/dev-environments/local-dev-node/)）

```bash
npx hardhat test --network localNode
```

### 5. 部署合约

**本地：**

```bash
npx hardhat run scripts/deploy.ts --network localNode
```

**Polkadot Hub TestNet：**

```bash
npx hardhat run scripts/deploy.ts --network polkadotTestnet
```

---

## 本人实测结果

在本地（Windows / Node v22.15.0）实际执行的结果（完整日志见 `docs/deployment.md`）：

- ✅ 编译：12 个 Solidity 文件全部编译通过
- ✅ 测试：**29 个测试用例全部通过**（用时约 3 秒）
- ✅ 部署：Factory、TokenA、TokenB、Pair 全部部署成功

---

## 目录结构

```
student-2231/
├── contracts/
│   ├── interfaces/    # 5 个接口
│   ├── libraries/     # Math / SafeMath / UQ112x112
│   ├── test/
│   │   └── ERC20.sol
│   ├── UniswapV2ERC20.sol
│   ├── UniswapV2Factory.sol
│   └── UniswapV2Pair.sol
├── docs/              # ★ 本人学习与实操产出
│   ├── notes.md
│   ├── deployment.md
│   └── test-report.md
├── ignition/modules/
│   └── UniswapV2Factory.ts
├── scripts/
│   └── deploy.ts
├── test/
│   ├── shared/utilities.ts
│   ├── UniswapV2ERC20.test.ts
│   ├── UniswapV2Factory.test.ts
│   └── UniswapV2Pair.test.ts
├── hardhat.config.ts
├── package.json
└── tsconfig.json
```

---

## Uniswap V2 架构速览

两个核心合约：

1. **Factory**：注册表 + 工厂。`createPair(tokenA, tokenB)` 用 CREATE2 部署新的 `UniswapV2Pair`，保证地址可预测且同一代币对唯一。
2. **Pair**：流动性池本体，实现 AMM 核心。恒定乘积公式 `x * y = k`。用户存入代币获得 LP Token 作为流动性凭证，0.3% 的 swap 手续费留在池中，按比例回馈给 LP。

更完整的笔记见 [`docs/notes.md`](./docs/notes.md)。

---

## 学号

**2231**
