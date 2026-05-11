import hre from "hardhat";
import { formatEther } from "viem";

async function main() {
  const CONTRACT_ADDRESS = "0x9021bcBD064EFdCD09B47dbfAe1c2BA4A74B4764"; // 填入 deploy.ts 运行后的地址
  const [owner] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  // 1. 基本数据查询：查询账户余额
  const balance = await publicClient.getBalance({ address: owner.account.address });
  console.log(`Account balance: ${formatEther(balance)} ETH`);

  // 2. 获取合约实例
  const storage = await hre.viem.getContractAt("Storage", CONTRACT_ADDRESS);

  // 3. 状态读取 (Read)
  const currentValue = await storage.read.getValue();
  console.log(`Current Value: ${currentValue}`);

  // 4. 状态更新 (Write / 交易发送)
  console.log("Updating value to 200...");
  const hash = await storage.write.setValue([200n]);
  
  // 等待交易确认
  await publicClient.waitForTransactionReceipt({ hash });
  console.log("Transaction confirmed. New value set.");

  // 5. 再次验证
  const newValue = await storage.read.getValue();
  console.log(`Updated Value: ${newValue}`);
}

main().catch(console.error);