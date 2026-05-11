# 区块链基本操作演示项目 (Ethers.js + Ganache)

本项目演示了如何使用 **Ethers.js** 库与以太坊虚拟机 (EVM) 兼容的区块链进行交互。涵盖了从连接节点到部署和操作智能合约的全过程。

## 核心功能
- **区块链连接**：连接到本地 RPC 节点。
- **数据查询**：获取区块高度和账户余额。
- **交易发送**：在账户之间转账 ETH。
- **合约部署**：编译并部署 `SimpleStorage` 智能合约。
- **状态操作**：读取合约状态并发送交易更新状态。

## 项目结构
- `contracts/SimpleStorage.sol`: 简单的存储合约。
- `compile.js`: 合约编译脚本（使用 `solc`）。
- `interact.js`: 区块链交互主逻辑脚本。
- `SimpleStorage.json`: 编译后的 ABI 和 Bytecode（运行编译脚本后生成）。

## 环境要求
- Node.js (建议 v20+)
- npm

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动本地区块链节点
打开一个新终端并运行：
```bash
npx ganache --host 127.0.0.1 --port 8545
```
*注意：启动后，请记下输出的第一个账户的私钥。如果私钥发生变化，需要更新 `interact.js` 中的 `privateKey` 变量。*

### 3. 编译智能合约
```bash
node compile.js
```
这将生成 `SimpleStorage.json` 文件。

### 4. 执行区块链交互
```bash
node interact.js
```

## 交互脚本详解 (`interact.js`)

脚本按以下步骤执行：
1. **连接节点**：通过 `JsonRpcProvider` 连接。
2. **查询余额**：使用 `provider.getBalance` 获取账户信息。
3. **发送交易**：创建 `Wallet` 实例并调用 `sendTransaction` 进行转账。
4. **部署合约**：使用 `ContractFactory` 部署合约，并等待交易确认。
5. **读取状态**：调用合约的 `view` 方法 `getValue()`。
6. **更新状态**：发送交易调用 `setValue(uint256)`，并等待区块确认。

## 运行结果示例
```text
1. Connected to blockchain at http://127.0.0.1:8545
Current Block Number: 0
Balance of Account 0 (0x...): 1000.0 ETH

Sending 1 ETH from Account 0 to Account 1...
Transaction Hash: 0x...
Transaction confirmed!

Deploying SimpleStorage contract...
Contract deployed to: 0x...
Initial Contract Value: 0
Updating Contract Value to 42...
Contract update confirmed!
Updated Contract Value: 42
```
