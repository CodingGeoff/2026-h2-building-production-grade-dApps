import hre from "hardhat";
import { formatEther, defineChain } from "viem";

// 1. 定义自定义链：Polkadot Asset Hub (Westend)
// 这一步解决了 NetworkNotFoundError，因为 Viem 默认不认识这个 Chain ID
const polkadotHubTestnet = defineChain({
  id: 420420417,
  name: 'Polkadot Asset Hub Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Westend',
    symbol: 'WND',
  },
  rpcUrls: {
    default: {
      http: ['https://westend-asset-hub-eth-rpc.polkadot.io'],
    },
    public: {
      http: ['https://westend-asset-hub-eth-rpc.polkadot.io'],
    },
  },
});

async function main() {
  // 替换为你部署后的真实合约地址
  const CONTRACT_ADDRESS = "0xe2aF667f7624cCEEbdB6b87cAF0DDc7D42C3B190" as const;

  console.log("=== Homework 4: Interaction Script ===");
  console.log(`Contract Address: ${CONTRACT_ADDRESS}`);

  // 2. 获取公共客户端 (用于读操作和查询余额)
  const publicClient = await hre.viem.getPublicClient({
    chain: polkadotHubTestnet
  });
  
  // 3. 获取钱包客户端 (用于写操作/发送交易)
  const [owner] = await hre.viem.getWalletClients({
    chain: polkadotHubTestnet
  });

  // --- 任务 1: 基本数据查询 ---
  const balance = await publicClient.getBalance({ address: owner.account.address });
  console.log(`\n[Query] Account: ${owner.account.address}`);
  console.log(`[Query] Balance: ${formatEther(balance)} WND`);

  // --- 任务 2: 获取合约实例 ---
  // 关键修复：必须通过 client 参数把前面创建好的客户端传进去
  const storage = await hre.viem.getContractAt("Storage", CONTRACT_ADDRESS, {
    client: { public: publicClient, wallet: owner }
  }) as any;

  // --- 任务 3: 状态读取 (Read) ---
  const currentValue = await storage.read.getValue();
  console.log(`\n[Read] Current Value in Storage: ${currentValue}`);

  // --- 任务 4: 状态更新 (Write / 交易发送) ---
  const newValue = 200n;
  console.log(`\n[Write] Updating value to ${newValue}...`);
  
  const hash = await storage.write.setValue([newValue]);
  console.log(`[Write] Transaction hash: ${hash}`);
  
  console.log("Waiting for transaction confirmation...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`[Write] Transaction confirmed in block ${receipt.blockNumber}`);

  // --- 任务 5: 最终验证 ---
  const finalValue = await storage.read.getValue();
  console.log(`\n[Verify] New Value in Storage: ${finalValue}`);

  if (finalValue === newValue) {
    console.log("\n✅ Success: Consistency check passed!");
  } else {
    console.log("\n❌ Error: Value was not updated correctly.");
  }
}

main().catch((error) => {
  console.error("\n❌ Script failed with error:");
  console.error(error);
  process.exitCode = 1;
});