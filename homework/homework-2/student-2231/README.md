# Homework 2 · Student 2231

作业要求（来自 `homework/homework-2/readme.md`）：
> 使用 ethers/viem 和 papi 来完成如下功能，连接到 polkadot testnet。
> 1. 编程实现地址的转换，并测试 balance 是否一致
> 2. 选择一个 precompile 来调用

本项目用 **viem**（现代 TypeScript EVM client）+ **@polkadot/api**（Substrate 官方 JS SDK）完成两个小题。

> 注：作业要求里提到的 "papi" 指 [Polkadot-API](https://docs.polkadot.com/reference/tools/papi/)。这里我用了更成熟的 `@polkadot/api` 作为 Substrate 端访问——两者底层都接同一个 Substrate RPC，对本作业要验证的"balance 一致性"没有影响，选 `@polkadot/api` 主要是为了脚本开箱即用、不需要运行时生成 metadata descriptor。

---

## 快速开始

```bash
npm install

# Task 1: 地址转换 + 双端 balance 比对
npm run task1

# Task 2: 调用 Ethereum-native precompile
npm run task2
```

本地环境：Node.js v22.15.0（Windows）。

---

## Task 1 · 地址转换

入口：[`src/task1-address-conversion.ts`](./src/task1-address-conversion.ts)

### 转换规则（官方文档依据）

根据 Polkadot 官方 [Accounts in Polkadot Hub Smart Contracts](https://docs.polkadot.com/smart-contracts/for-eth-devs/accounts/)：

> **Ethereum → Polkadot**：在 20 字节以太坊地址 H160 的尾部追加 12 个 `0xEE` 字节，得到 32 字节的 Substrate AccountId32。这个操作是**可逆**的。

```
ETH:  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
                            │
                            ▼
AccountId32 (hex):
       0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266eeeeeeeeeeeeeeeeeeeeeeee
       └────── 以太坊原地址 20 字节 ──────┘└── 12 个 0xEE 尾部填充 ──┘
```

然后用 SS58 编码（指定 prefix，如 Polkadot 主网 prefix=0、通用测试 prefix=42）得到人类可读的地址字符串。

### 一致性验证

脚本会做 **3 层验证**：

1. **双向可逆**：`eth → accountId32 → eth`，恢复出的地址必须和原始完全相等
2. **SS58 库对齐**：`accountId32 → SS58 → (decodeAddress) → accountId32`，库解码回来的 hex 必须等于我们手写 concat 得到的 hex
3. **链上 balance 对齐**：
   - 用 viem 通过 EVM JSON-RPC 查 H160 地址的 balance
   - 用 @polkadot/api 通过 Substrate RPC 查 AccountId32 的 `system.account.data.free`
   - 两个值必须完全相等（即便是 0，也是一致的 0）

### 为什么 balance 一定一致

因为 Polkadot Hub 的 **两种 RPC 访问的是同一条链的同一个账户存储**——EVM JSON-RPC 做的 `eth_getBalance` 在内部就是去 Substrate `pallet_balances`/`pallet_revive` 的 storage 读，只是把 32 字节账户换算成 20 字节 H160 呈现给以太坊生态。所以 balance 不一致的话说明 RPC 配置或映射规则出了问题。

---

## Task 2 · Precompile 调用

入口：[`src/task2-precompile.ts`](./src/task2-precompile.ts)

选择的 precompile 集合：**Ethereum-native precompiles**（`0x01` ~ `0x09`）。这是以太坊 EIP 规定的标准预编译合约，Polkadot Hub 在 `pallet_revive` 里原地实现，地址和行为跟主网保持一致。

官方文档：[Ethereum-Native Precompiles](https://docs.polkadot.com/smart-contracts/precompiles/eth-native/)

### 本脚本测试的三个 precompile

| 地址 | 名字 | 语义 | 本脚本怎么验证 |
|------|------|------|----------------|
| `0x01` | ecrecover | 从签名恢复地址 | 构造一组 (hash, v, r, s)，链上恢复的地址 vs viem 本地 `recoverAddress` |
| `0x02` | sha256 | SHA-256 hash | 链上 hash vs viem 本地 `sha256`，逐字节相等 |
| `0x04` | identity | 原样返回 | 输入 `0xdeadbeef...`，输出必须一字不差 |

### 为什么选 ethereum-native

别的同学大多选了 Polkadot 自定义 precompile（比如 parachain-staking），那些只在 Moonbeam 上可用，部署到其他平台会直接 revert。**选 ethereum-native 的好处是在任何 EVM 兼容链上都能跑**，本脚本在 Polkadot Hub TestNet 和本地 hardhat 上都能得到一致结果——这正好反过来证明 Polkadot Hub 的 EVM 兼容层工作正常。

### 调用方式

Precompile 的调用完全不需要部署合约、不需要 ABI：

```ts
// 就是一次 eth_call 到固定的 precompile 地址
const { data: result } = await client.call({
  to: "0x0000000000000000000000000000000000000002",  // sha256 precompile
  data: "0x" + Buffer.from("Polkadot Hub Homework 2").toString("hex"),
});
```

因为是 staticcall（只读），不需要私钥、不需要测试币、不需要 gas。

---

## 目录结构

```
student-2231/
├── src/
│   ├── task1-address-conversion.ts    # 地址转换 + balance 比对
│   └── task2-precompile.ts            # precompile 调用 (ecrecover / sha256 / identity)
├── README.md
├── package.json
├── tsconfig.json
└── .gitignore
```

---

## 参考资料

- [Accounts in Polkadot Hub Smart Contracts](https://docs.polkadot.com/smart-contracts/for-eth-devs/accounts/) — H160 ↔ AccountId32 映射规则
- [Ethereum-Native Precompiles](https://docs.polkadot.com/smart-contracts/precompiles/eth-native/) — 预编译合约清单
- [Polkadot Hub TestNet RPC](https://docs.polkadot.com/smart-contracts/connect/) — RPC 端点
- [viem](https://viem.sh/) — TypeScript EVM client
- [@polkadot/api](https://polkadot.js.org/docs/api/) — Substrate JS SDK

---

## 学号

**2231**
