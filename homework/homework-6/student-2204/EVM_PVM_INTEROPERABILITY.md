# EVM-PVM 跨链互操作性指南

本文档详细说明了 EVM（以太坊虚拟机）和 PVM（可编程虚拟机）之间的跨链通信实现。

## 架构概述

### 系统设计

```
┌─────────────────────────────────────────────────────────────┐
│                    EVM Chain (Ethereum)                      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  EVMToPVMBridge                                      │   │
│  │  ├─ deposit()                                        │   │
│  │  ├─ bridgeTowardsPVM()                              │   │
│  │  ├─ bridgeFromPVM()                                 │   │
│  │  └─ withdraw()                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↕ (Events)                         │
│                    Bridge Service                            │
│                           ↕ (Messages)                       │
│  ┌──────────────────────────────────────────────────────┐   │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    PVM Chain (Avalanche C)                   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PVMBridgeReceiver                                   │   │
│  │  ├─ handleCrossChainMessage()                        │   │
│  │  ├─ sendBackToEVM()                                 │   │
│  │  └─ getBalance()                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 核心合约

### 1. EVMToPVMBridge (EVM 端)

**功能**：管理从 EVM 到 PVM 的资产转移

```solidity
contract EVMToPVMBridge {
    // 存储用户余额
    mapping(address => uint256) public userBalances;
    
    // 存储跨链消息
    mapping(bytes32 => CrossChainMessage) public messages;
}
```

**主要方法**：

#### deposit(uint256 amount)
将资金存放到桥中

```javascript
await bridge.deposit(ethers.parseEther("100"));
```

#### bridgeTowardsPVM(address recipient, uint256 amount, bytes data)
向 PVM 发送资产

```javascript
const messageId = await bridge.bridgeTowardsPVM(
  recipientAddress,
  ethers.parseEther("50"),
  "0x"
);
// 返回消息 ID，用于追踪
```

**事件发出**：
```javascript
event MessageSentToPVM(
    bytes32 indexed messageId,
    address indexed sender,
    address indexed recipient,
    uint256 amount
);
```

#### bridgeFromPVM(bytes32 messageId, address sender, address recipient, uint256 amount, bytes data)
接收来自 PVM 的资产

```javascript
await bridge.bridgeFromPVM(
  messageId,
  senderAddress,
  recipientAddress,
  amount,
  "0x"
);
```

**访问控制**：仅限 bridge gateway

### 2. PVMBridgeReceiver (PVM 端)

**功能**：处理来自 EVM 的跨链消息

```solidity
contract PVMBridgeReceiver {
    // 存储 PVM 侧的余额
    mapping(address => uint256) public balances;
    
    // 追踪已处理的消息
    mapping(bytes32 => bool) public processedMessages;
}
```

**主要方法**：

#### handleCrossChainMessage(address sender, address recipient, uint256 amount, bytes data)
处理来自 EVM 的消息

```javascript
// 由 bridge gateway 调用
await receiver.handleCrossChainMessage(
  senderAddress,
  recipientAddress,
  amount,
  data
);
```

**事件发出**：
```javascript
event TokensReceived(
    address indexed sender,
    address indexed recipient,
    uint256 amount
);
```

#### sendBackToEVM(address recipient, uint256 amount, bytes data)
将资产返回到 EVM

```javascript
const messageId = await receiver.sendBackToEVM(
  recipientAddress,
  ethers.parseEther("25"),
  "0x"
);
```

### 3. CrossChainSwap (高级功能)

**功能**：实现跨链原子交换

```solidity
contract CrossChainSwap {
    // 存储交换订单
    mapping(bytes32 => SwapOrder) public swapOrders;
}
```

**主要方法**：

#### initiateSwap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, uint256 deadline)
在 EVM 上启动交换

```javascript
const orderId = await swap.initiateSwap(
  tokenAAddress,
  tokenBAddress,
  ethers.parseEther("100"),
  ethers.parseEther("90"),
  deadline
);
```

#### completeSwap(bytes32 orderId, uint256 amountOut)
在 PVM 上完成交换

```javascript
await swap.completeSwap(orderId, resultAmount);
```

## 消息流

### 场景 1：从 EVM 到 PVM 的转移

```
1. User calls bridge.deposit(100 tokens)
   ↓
2. User calls bridge.bridgeTowardsPVM(recipient, 100 tokens)
   ├─ Lock tokens in EVM
   ├─ Generate messageId
   ├─ Emit MessageSentToPVM event
   ↓
3. Bridge service listens to event
   ├─ Fetch message details
   ├─ Create cross-chain message
   ↓
4. Bridge service calls receiver.handleCrossChainMessage()
   ├─ Verify message authenticity
   ├─ Mint tokens on PVM
   ├─ Update user balance
   ↓
5. User owns 100 tokens on PVM
```

### 场景 2：从 PVM 回到 EVM

```
1. User calls receiver.sendBackToEVM(recipient, amount)
   ├─ Burn tokens on PVM
   ├─ Generate messageId
   ├─ Emit TokensSent event
   ↓
2. Bridge service listens to event
   ├─ Create cross-chain message
   ↓
3. Bridge service calls bridge.bridgeFromPVM()
   ├─ Verify message
   ├─ Unlock tokens on EVM
   ├─ Update balance
   ↓
4. User receives tokens on EVM
```

## 使用示例

### 示例 1：简单的跨链转移

```javascript
const { ethers } = require("ethers");

// 连接到 EVM
const evmProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
const evmBridge = new ethers.Contract(
  BRIDGE_ADDRESS,
  BRIDGE_ABI,
  evmProvider.getSigner()
);

// 连接到 PVM
const pvmProvider = new ethers.JsonRpcProvider(AVALANCHE_C_CHAIN_URL);
const pvmReceiver = new ethers.Contract(
  RECEIVER_ADDRESS,
  RECEIVER_ABI,
  pvmProvider.getSigner()
);

// 第 1 步：在 EVM 上存放资金
const depositTx = await evmBridge.deposit(ethers.parseEther("100"));
await depositTx.wait();
console.log("Deposited 100 tokens to EVM bridge");

// 第 2 步：启动跨链转移
const recipient = "0x..."; // PVM 上的收件人地址
const bridgeTx = await evmBridge.bridgeTowardsPVM(
  recipient,
  ethers.parseEther("50"),
  "0x"
);
const receipt = await bridgeTx.wait();
console.log("Bridge transfer initiated:", receipt.transactionHash);

// 获取消息 ID
const events = await evmBridge.queryFilter("MessageSentToPVM");
const messageId = events[events.length - 1].args.messageId;

// 第 3 步：监听事件并在 PVM 上处理（由 bridge 服务完成）
// 在实际部署中，这会由中心化或去中心化的 bridge 服务处理

// 第 4 步：验证 PVM 上的余额
const pvmBalance = await pvmReceiver.getBalance(recipient);
console.log("PVM Balance:", ethers.formatEther(pvmBalance));

// 第 5 步：返回到 EVM
const returnTx = await pvmReceiver.sendBackToEVM(
  evmRecipient,
  ethers.parseEther("25"),
  "0x"
);
await returnTx.wait();
console.log("Return transfer initiated");
```

### 示例 2：跨链交换

```javascript
// 启动交换
const swapTx = await swap.initiateSwap(
  tokenA,
  tokenB,
  ethers.parseEther("100"),
  ethers.parseEther("90"),  // 最小输出
  Math.floor(Date.now() / 1000) + 3600
);

const swapReceipt = await swapTx.wait();
const swapEvents = await swap.queryFilter("SwapInitiated");
const orderId = swapEvents[swapEvents.length - 1].args.orderId;

console.log("Swap initiated with order ID:", orderId);

// 在 PVM 上完成交换（由 bridge 服务或预言机触发）
const completeSwapTx = await swap.completeSwap(
  orderId,
  ethers.parseEther("95")  // 实际输出金额
);
await completeSwapTx.wait();
console.log("Swap completed");
```

## 安全注意事项

### 1. 消息验证

```solidity
// 验证消息真实性
bytes32 digest = keccak256(abi.encodePacked(
    DOMAIN_SEPARATOR,
    keccak256(abi.encode(
        MESSAGE_TYPEHASH,
        messageId,
        sender,
        recipient,
        amount
    ))
));

require(
    ecrecover(digest, v, r, s) == bridge,
    "Invalid signature"
);
```

### 2. 重放攻击防护

```solidity
// 使用 nonce 和时间戳防止重放
require(!processedMessages[messageId], "Already processed");
require(block.timestamp <= message.deadline, "Message expired");

processedMessages[messageId] = true;
```

### 3. 速率限制

```solidity
require(
    totalTransferedToday[msg.sender] + amount <= DAILY_LIMIT,
    "Daily limit exceeded"
);

totalTransferedToday[msg.sender] += amount;
```

## 性能优化

### 批量处理

```solidity
struct BatchMessage {
    bytes32[] messageIds;
    address[] senders;
    address[] recipients;
    uint256[] amounts;
}

function processBatch(BatchMessage memory batch) 
    internal 
    onlyBridgeService 
{
    for (uint i = 0; i < batch.messageIds.length; i++) {
        processMessage(batch.messageIds[i], ...);
    }
}
```

### 缓存和预热

```javascript
// 预先加载热点数据
const cachedBalances = new Map();

async function getBalanceWithCache(user) {
    if (cachedBalances.has(user)) {
        return cachedBalances.get(user);
    }
    const balance = await contract.getBalance(user);
    cachedBalances.set(user, balance);
    return balance;
}
```

## 部署考虑事项

### 跨链消息队列

使用 Redis 或 Kafka 存储待处理的跨链消息：

```javascript
// 存储消息到队列
await queue.push({
    messageId,
    sourceChain: 'EVM',
    targetChain: 'PVM',
    sender,
    recipient,
    amount,
    status: 'pending'
});

// 处理队列
async function processPendingMessages() {
    const message = await queue.pop();
    if (message) {
        await executeMessage(message);
    }
}
```

### 故障恢复

```javascript
// 实现重试机制
async function executeWithRetry(
    messageId,
    func,
    maxRetries = 3
) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await func(messageId);
            return;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await delay(1000 * (2 ** i)); // 指数退避
        }
    }
}
```

## 监控和告警

### 关键指标

```javascript
// 记录跨链交易统计
const metrics = {
    totalMessages: 0,
    successfulMessages: 0,
    failedMessages: 0,
    averageLatency: 0,
    totalVolumeTransferred: 0n
};

// 告警阈值
if (failureRate > 0.05) {
    alert("High failure rate detected");
}

if (averageLatency > 60000) {
    alert("High latency detected");
}
```

## 测试

### 单元测试

```javascript
// 测试消息生成
it("Should generate correct message ID", async () => {
    const messageId = ethers.id(
        ethers.defaultAbiCoder.encode(
            ["address", "address", "uint256"],
            [sender, recipient, amount]
        )
    );
    expect(messageId).to.not.be.empty;
});

// 测试访问控制
it("Should reject non-gateway calls", async () => {
    await expect(
        bridge.bridgeFromPVM(messageId, sender, recipient, amount, "0x")
    ).to.be.revertedWith("Only bridge gateway");
});
```

## 相关资源

- [EVM 文档](https://ethereum.org/en/developers/docs/evm/)
- [Avalanche PVM 文档](https://docs.avax.network/)
- [IBC（跨链通信协议）](https://github.com/cosmos/ibc)
- [Wormhole Bridge](https://wormhole.com/)
- [Stargate Protocol](https://stargate.finance/)

## 许可证

MIT
