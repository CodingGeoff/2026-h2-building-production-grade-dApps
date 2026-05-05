// src/config.ts
// =====================================================================
// 📌 配置文件：存放网络连接信息
// =====================================================================

// Westend Asset Hub 测试网的以太坊兼容 RPC 端点
// 这是 Polkadot 官方提供的 ETH Proxy 地址
// 参考：https://docs.polkadot.com/smart-contracts/for-eth-devs/json-rpc-apis/
export const ETH_RPC_URL = "https://westend-asset-hub-eth-rpc.polkadot.io";

// Westend Asset Hub 测试网的 Substrate WebSocket 端点（用于 PAPI）
export const SUBSTRATE_WS_URL = "wss://westend-asset-hub-rpc.polkadot.io";

// Westend Asset Hub 的链 ID（EVM Chain ID）
export const CHAIN_ID = 420420421n;

// SS58 前缀：Westend 使用 42（通用测试网前缀）
export const SS58_PREFIX = 42;

// ⚠️  重要说明：
// 请将下面的私钥替换成你自己的测试钱包私钥！
// 绝对不要使用存有真实资产的钱包！
// 可以用 MetaMask 创建一个全新的测试账户
export const TEST_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat 默认测试账户 #0，仅供演示

// 对应的以太坊地址（从私钥推导）
export const TEST_ETH_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";