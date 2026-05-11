import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ethers, JsonRpcProvider } from 'ethers';
import dotenv from "dotenv"
dotenv.config()

// 修复 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ProviderConfig {
  rpc: string;
  chainId: number;
  name: string;
}

const createProvider = (rpcUrl: string, chainId: number, chainName: string) => {
  const provider = new JsonRpcProvider(rpcUrl, {
    chainId: chainId,
    name: chainName,
  });
  return provider;
};

const getAbi = (contractName: string) => {
  try {
    const abiPath = join(__dirname, '../abis', `${contractName}.json`);
    return JSON.parse(readFileSync(abiPath, 'utf8'));
  } catch (error) {
    console.error(`Could not find ABI for contract ${contractName}:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
};

const getByteCode = (contractName: string) => {
  try {
    const bytecodePath = join(__dirname, '../artifacts', `${contractName}.bin`);
    const bytecode = readFileSync(bytecodePath, 'utf8').trim();
    return bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`;
  } catch (error) {
    console.error(`Could not find bytecode for contract ${contractName}:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
};


const deployContract = async (contractName: string, privateKey: string, providerConfig: ProviderConfig) => {
  console.log(`Deploying ${contractName}...`);
  try {
    
    const provider = createProvider(providerConfig.rpc, providerConfig.chainId, providerConfig.name);
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`Deploying from address: ${wallet.address}`);

    const factory = new ethers.ContractFactory(getAbi(contractName), getByteCode(contractName), wallet);
    const contract = await factory.deploy();
    await contract.waitForDeployment();

    // Step 3: 保存地址
    const address = await contract.getAddress();
    console.log(`✅ Contract ${contractName} deployed at: ${address}`);

    const addressesFile = join(__dirname, 'contract-address.json');
    const addresses = existsSync(addressesFile) ? JSON.parse(readFileSync(addressesFile, 'utf8')) : {};
    addresses[contractName] = address;
    writeFileSync(addressesFile, JSON.stringify(addresses, null, 2), 'utf8');
    
  } catch (error) {
    console.error(`❌ Failed to deploy contract ${contractName}:`, error);
  }
};

const providerConfig = {
  rpc: 'https://services.polkadothub-rpc.com/testnet',
  chainId: 420420417,
  name: 'polkadot-hub-testnet',
};


const privateKey = dotenv.config().parsed?.PRIVATE_KEY
if (!privateKey) {
  throw new Error("❌ 错误：未找到 PRIVATE_KEY，请检查 .env 文件");
}

deployContract('Storage', privateKey, providerConfig);