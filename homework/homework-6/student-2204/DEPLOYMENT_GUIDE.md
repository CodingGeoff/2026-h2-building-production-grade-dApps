# Uniswap V2 部署指南

本指南说明如何将 Uniswap V2 合约部署到 Ethereum 测试网（如 Sepolia 或 Mumbai）。

## 前置条件

1. **Node.js 和 npm** 已安装
2. **Hardhat** 项目已配置
3. **测试网 RPC URL**：
   - Sepolia: https://sepolia.infura.io/v3/YOUR_INFURA_KEY
   - Mumbai: https://rpc-mumbai.maticvigil.com
4. **私钥**：拥有测试 ETH/MATIC 的账户的私钥
5. **测试 ETH/MATIC**：用于支付 gas 费用

## 环境配置

### 1. 创建 .env 文件

在项目根目录创建 `.env` 文件：

```bash
cp .env.example .env
```

### 2. 编辑 .env 文件

```env
# Sepolia 配置
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_API_KEY
PRIVATE_KEY=your_private_key_without_0x_prefix

# 或 Mumbai 配置
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
PRIVATE_KEY=your_private_key_without_0x_prefix
```

⚠️ **安全提示**：
- 不要将 `.env` 文件提交到 git
- 使用专门用于测试的账户私钥
- 不要使用主网私钥

## 获取测试 ETH

### Sepolia

使用这些 faucet 获取测试 ETH：
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://www.infura.io/faucet/sepolia
- https://sepoliafaucet.com

### Mumbai (Polygon)

使用这些 faucet 获取测试 MATIC：
- https://faucet.polygon.technology/
- https://mumbaifaucet.com

## 部署步骤

### 步骤 1：安装依赖

```bash
npm install
```

### 步骤 2：编译合约

```bash
npx hardhat compile
```

验证没有编译错误。

### 步骤 3：运行测试

```bash
npx hardhat test
```

确保所有测试都通过。

### 步骤 4：部署到 Sepolia

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### 步骤 4（替代）：部署到 Mumbai

```bash
npx hardhat run scripts/deploy.js --network mumbai
```

## 部署输出

部署完成后，您将看到类似以下内容：

```
========== Deployment Summary ==========
Token A: 0x...
Token B: 0x...
Factory: 0x...
Router: 0x...
Pair: 0x...
=========================================
```

这些地址也会保存在 `deployment-addresses.json` 文件中。

## 验证合约（可选）

要在 Etherscan 上验证您的合约：

### Sepolia Etherscan 验证

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

例如，验证 Factory：

```bash
npx hardhat verify --network sepolia 0x... 0xDeployerAddress
```

## 测试部署的合约

### 1. 创建交易对

```bash
npx hardhat run scripts/create-pair.js --network sepolia
```

### 2. 添加流动性

```bash
npx hardhat run scripts/add-liquidity.js --network sepolia
```

### 3. 执行交换

```bash
npx hardhat run scripts/swap.js --network sepolia
```

## 常见问题

### Q: 部署失败，错误 "Account balance is insufficient"
**A**: 确保您的账户有足够的测试 ETH/MATIC，并且 RPC URL 正确。

### Q: 交易卡住了
**A**: 检查 gas 价格设置。在高网络活动时期，可能需要增加 gas 价格。

### Q: 合约地址不同
**A**: 每次部署时，合约地址都会不同。这是正常的。

### Q: 无法连接到 RPC
**A**: 
- 验证 RPC URL 正确
- 检查网络连接
- 确保 API 密钥有效（如果使用 Infura）

## 监控部署

### 在 Etherscan 上查看交易

- **Sepolia**: https://sepolia.etherscan.io/ (搜索交易哈希)
- **Mumbai**: https://mumbai.polygonscan.com/ (搜索交易哈希)

### 查看合约

部署后，可以在区块浏览器上查看：
- Token 余额
- Pair 储备
- 交换历史

## 下一步

1. **与合约交互**：使用 Web3.js 或 ethers.js 编写脚本来与部署的合约交互
2. **部署前端**：创建 React 应用与合约交互
3. **添加更多代币**：在现有工厂创建更多交易对
4. **主网部署**：准备好后，可以部署到主网（需要真实 ETH）

## 安全注意事项

1. 始终在测试网上测试
2. **不要在主网上使用私钥**
3. 验证所有合约代码
4. 在大额交易前进行小额测试
5. 使用硬件钱包存储大额资金

## 支持资源

- [Hardhat 文档](https://hardhat.org/)
- [Ethers.js 文档](https://docs.ethers.org/)
- [Uniswap V2 文档](https://docs.uniswap.org/protocol/V2/)
- [Chainlink 预言机](https://chain.link/)

## 获取帮助

如有问题，请查看：
- 项目 README.md
- 合约源代码注释
- 测试文件示例
