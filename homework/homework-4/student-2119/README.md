# Homework 4 · student-2119

使用 **Viem**（配合 Hardhat 3）完成与链的连接、基础查询、转账、`SimpleStorage` 合约的部署，以及合约状态的读取与更新。

## 涵盖内容

| 任务 | 脚本 |
| --- | --- |
| 连接 RPC + 链上基础查询（chainId、区块号、gasPrice、余额） | `scripts/connect-query.ts` |
| 发送原生代币转账 | `scripts/send-transfer.ts` |
| 部署合约 + `retrieve` 读状态 + `store` 写状态 + 再读 | `scripts/deploy-and-interact.ts` |

链定义见 `scripts/chain.ts`（chain id `420420417`，Polkadot Hub EVM testnet）。

## 准备

```bash
cd homework/homework-4/student-2119
npm install
cp .env.example .env
# 编辑 .env：填入 PRIVATE_KEY；转账脚本还需 TO_ADDRESS
```

编译合约：

```bash
npm run compile
```

## 运行（测试网 `polka`）

前提：`hardhat.config.ts` 里 `polka` 网络使用环境变量中的 `PRIVATE_KEY` 与 `RPC_URL`。

```bash
# 基础查询（若有 PRIVATE_KEY 会额外打印地址与余额）
npm run query

# 向 TO_ADDRESS 转原生代币（可调 TRANSFER_AMOUNT，默认 0.001）
npm run transfer

# 部署 SimpleStorage，写入 2119 并验证读取
npm run deploy
```

本地模拟链（不发真实交易，用于自检脚本与编译）：

```bash
npm run simulate
```

## 说明

- `connect-query.ts` 仅依赖 Viem `PublicClient`，演示「连接 + 读链上公开数据」。
- `send-transfer.ts` 使用 `WalletClient.sendTransaction` 演示「签名并发送交易」。
- `deploy-and-interact.ts` 通过 Hardhat 的 `network.create()` 绑定 CLI 上的 `--network`，在同一连接上完成部署与读写。
