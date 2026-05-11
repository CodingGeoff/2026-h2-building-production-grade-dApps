import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import dotenv from "dotenv"
dotenv.config()


// --- 1. 修复 __dirname (ESM 必须) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- 2. 类型定义 ---
interface ProviderConfig {
  name: string;
  rpc: string;
  chainId: number;
}

// --- 3. 配置区域 ---
// ✅ 修正路径：指向同级的 contracts 文件夹
const ARTIFACTS_DIR = join(__dirname, '..', 'contracts');

// ⚠️ 关键修改：这里填入你的私钥
const private_Key = dotenv.config().parsed?.PRIVATE_KEY
if (!private_Key) {
  throw new Error("❌ 错误：未找到 PRIVATE_KEY，请检查 .env 文件");
}


// ⚠️ 替换为你部署成功的合约地址
const CONTRACT_ADDRESS = '0x2E44C3A0032c5A2F968e34175C2D314BEC31E7B8'; 

const PROVIDER_CONFIG: ProviderConfig = {
  name: 'polkadot-hub',
  // 注意：如果这个 URL 报 403，请换成 Infura/Alchemy 或者本地 Ganache 地址
  rpc: 'https://services.polkadothub-rpc.com/testnet', 
  chainId: 420420417,
};

// --- 4. 核心逻辑 ---

/**
 * 创建 RPC 提供商
 */
const createProvider = (config: ProviderConfig): ethers.JsonRpcProvider => {
  return new ethers.JsonRpcProvider(config.rpc, {
    chainId: config.chainId,
    name: config.name,
  });
};

/**
 * 创建钱包 - 使用私钥
 */
const createWallet = (privateKey: string, provider: ethers.JsonRpcProvider): ethers.Wallet => {
  return new ethers.Wallet(privateKey, provider);
};

/**
 * 读取 ABI 文件
 */
const loadContractAbi = (contractName: string, directory: string = ARTIFACTS_DIR): any[] => {
  const contractPath = join(directory,'..', 'abis',  `${contractName}.json`);
  const contractJson = JSON.parse(readFileSync(contractPath, 'utf8'));
  // 兼容处理：如果是 Hardhat 格式取 abi，如果是纯 ABI 格式直接返回
  return contractJson.abi || contractJson;
};

/**
 * 主交互函数
 */
const interactWithStorageContract = async (
  contractName: string,
  contractAddress: string,
  privateKey: string,
  providerConfig: ProviderConfig,
  numberToSet: number
): Promise<void> => {
  try {
    console.log(`\n🚀 开始与合约交互...`);

    // 1. 初始化连接
    const provider = createProvider(providerConfig);
    
    // 🔑 使用私钥创建钱包
    const wallet = createWallet(privateKey, provider);
    
    // 打印余额（调试用，确认连接正常）
    const balance = await provider.getBalance(wallet.address);
    console.log(`当前钱包地址: ${wallet.address}`);
    console.log(`当前余额: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.warn('⚠️ 警告: 钱包余额为 0，交易可能会失败！');
    }

    // 2. 加载合约实例
    const abi = loadContractAbi(contractName);
    const contract = new ethers.Contract(contractAddress, abi, wallet);

    //  读取旧值操作 (对应合约中的 retrieve 函数)
    // ✅ 修正：调用合约中的 retrieve 函数
    const oldStoredValue = await contract.retrieve();
    console.log(`\n🔍 查询结果: 合约中现在的数值是 [ ${oldStoredValue.toString()} ]`);

    // 3. 写入操作 (对应合约中的 store 函数)
    console.log(`\n📝 步骤 1: 准备调用 store(${numberToSet})`);
    
    // ✅ 修正：调用合约中的 store 函数
    const tx = await contract.store(numberToSet);
    console.log(`交易已广播，Hash: ${tx.hash}`);
    
    // 等待上链
    console.log(`⏳ 等待区块确认...`);
    await tx.wait(); 
    
    console.log(`✅ 交易成功！`);

    // 4. 读取操作 (对应合约中的 retrieve 函数)
    // ✅ 修正：调用合约中的 retrieve 函数
    const storedValue = await contract.retrieve();
    console.log(`\n🔍 查询结果: 合约中现在的数值是 [ ${storedValue.toString()} ]`);

  } catch (error: any) {
    console.error('\n❌ 交互失败:', error.message || error);
    
    // 常见错误提示
    if (error.code === 'NETWORK_ERROR') {
      console.log('💡 提示: 检查 RPC URL 是否可访问，或者是否需要 API Key');
    } else if (error.reason === 'insufficient funds') {
      console.log('💡 提示: 你的账户余额不足以支付 Gas 费');
    }
  }
};

// --- 5. 执行 ---
interactWithStorageContract(
  'Storage',       // 合约名 (对应 Storage.json)
  CONTRACT_ADDRESS,// 合约地址
  private_Key,     // 私钥
  PROVIDER_CONFIG, // 网络配置
  1             // 要设置的数值
);