# Homework 4 · Student 2231

作业要求（来自 `homework/homework-4/readme.md`）：
> 使用 Ethers、Viem 或者 Web3.py 的任意一个，完成和区块链的连接，基本数据查询。
> 交易发送，智能合约的部署，状态读取和更新的操作。

本项目用 **viem** 一次跑完：连接 → 查询 → 转账 → 部署合约 → 读状态 → 写状态 → 再读。

---

## 核心思路

不做简单的 ERC20 demo（同学重复度最高），改做一个小小的 **链上留言板** `Guestbook.sol`：
- 每个地址可以 `sign(message)` 留一句话
- 再次留言会覆盖原内容并更新时间戳
- 提供 `totalSigners` / `messageOf` / `hasSigned` 等只读查询

这个设计的好处：**一次脚本调用就能演示到全部 6 类操作**（连接、查询、转账、部署、读、写），而且业务语义清晰好验证。

---

## 快速开始

```bash
npm install
npm run compile              # 编译 Guestbook.sol
npm run run-all              # 默认连 Polkadot Hub TestNet
```

如果想在本地 hardhat node 跑：

```bash
# 终端 A
npx hardhat node

# 终端 B
HARDHAT_NODE=1 npm run run-all
```

### 配置私钥

真实部署到 TestNet 时需要给 signer 加钱。两种方式：

```bash
# Windows PowerShell
$env:PRIVATE_KEY="0x..."
npm run run-all
```

或者在项目根建一个 `.env` 文件：

```
PRIVATE_KEY=0xyour_private_key_here
```

> 脚本默认 fallback 到 Hardhat 的第 0 号公开测试账户 `0xac09...ff80`。**只能用于本地测试**，TestNet 上这个账户没钱也没法签交易。

---

## 脚本逐步做了什么

`scripts/run-all.ts`:

1. **连接**：`createPublicClient` + `createWalletClient` 指向 Polkadot Hub TestNet（chainId 420420417）
2. **查询**：`getChainId`、`getBlockNumber`、`getGasPrice`、`getBalance`
3. **发送交易**：`walletClient.sendTransaction` 往 `0x...dEaD` 转 0.0001 DOT，`waitForTransactionReceipt` 等确认
4. **部署合约**：`walletClient.deployContract({ abi, bytecode })` 把 `Guestbook.sol` 编译产物部署到测试网
5. **读状态（初始）**：`readContract` 调用 `totalSigners()` → 期望 0，`hasSigned(me)` → 期望 false
6. **写状态**：`writeContract` 调 `sign("Hello from student-2231 via viem")`
7. **再读状态**：`totalSigners` → 1，`hasSigned(me)` → true，`messageOf(me)` → 留言内容 + 时间戳
8. **断言**：对上述 3 个值做硬断言，脚本抛错 = 作业失败

脚本结尾会输出部署的合约地址，可以在 Polkadot 区块浏览器上核对。

---

## 目录结构

```
student-2231/
├── contracts/
│   └── Guestbook.sol
├── scripts/
│   └── run-all.ts
├── README.md
├── hardhat.config.cjs
├── package.json
├── tsconfig.json
└── .gitignore
```

---

## 参考资料

- [viem docs](https://viem.sh/)
- [Polkadot Hub TestNet RPC](https://docs.polkadot.com/smart-contracts/connect/)
- [Hardhat](https://hardhat.org/docs)

## 学号

**2231**
