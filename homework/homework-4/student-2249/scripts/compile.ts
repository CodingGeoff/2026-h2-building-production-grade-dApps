import solc from 'solc';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { basename, join, dirname } from 'path';
import { fileURLToPath } from 'url';

// --- 1. 修复 __dirname (ESM 必须) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- 2. 辅助函数 ---
const ensureDir = (dirPath: string) => {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
};

// --- 3. 编译主逻辑 ---
const compileContract = (solidityFilePath: string, abiDir: string, artifactsDir: string) => {
  try {
    // 1. 读取文件
    const source = readFileSync(solidityFilePath, 'utf8');
    // 获取文件名，例如 "Storage.sol"
    const fileName = basename(solidityFilePath);

    console.log(`🔨 正在编译文件: ${fileName}`);

    // 2. 构造编译器输入
    const input = {
      language: 'Solidity',
      sources: {
        // 这里的键名必须和文件名完全一致
        [fileName]: {
          content: source,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['*'], // 请求所有输出
          },
        },
      },
    };

    // 3. 执行编译
    const rawOutput = solc.compile(JSON.stringify(input));
    const output = JSON.parse(rawOutput);

    // 4. 检查错误
    if (output.errors) {
      const errors = output.errors.filter((error: any) => error.severity === 'error');
      if (errors.length > 0) {
        console.error('❌ 编译出错:');
        errors.forEach((err: any) => console.error(err.formattedMessage));
        return;
      }
    }

    // 5. 确保输出目录存在
    ensureDir(abiDir);
    ensureDir(artifactsDir);

    // 6. 遍历并保存结果
    if (output.contracts) {
      // 这里的 sourceFile 就是我们在 input 里定义的 fileName (Storage.sol)
      for (const [sourceFile, contracts] of Object.entries(output.contracts)) {
        console.log(`\n🔍 正在处理源文件: ${sourceFile}`);
        
        // 遍历该文件下的所有合约
        for (const [contractName, contract] of Object.entries(contracts as any)) {
          console.log(`✅ 找到合约: ${contractName}`);

          // 定义输出路径
          const abiPath = join(abiDir, `${contractName}.json`);
          const bytecodePath = join(artifactsDir, `${contractName}.bin`);

          // 写入 ABI
          writeFileSync(abiPath, JSON.stringify(contract.abi, null, 2));
          console.log(`   💾 ABI 已保存: ${abiPath}`);

          // 写入 Bytecode
          writeFileSync(bytecodePath, contract.evm.bytecode.object);
          console.log(`   💾 字节码已保存: ${bytecodePath}`);
        }
      }
    } else {
      console.log('⚠️ 编译成功，但未找到任何合约对象 (output.contracts 为空)');
    }

  } catch (error) {
    console.error('❌ 编译过程异常:', error);
  }
};

// --- 4. 路径配置 ---
// 确保这里指向的是你刚才修改过的 Storage.sol
const solidityFilePath = join(__dirname, '..', 'contracts', 'Storage.sol');
const abiDir = join(__dirname,'..',  'abis');
const artifactsDir = join(__dirname,'..',  'artifacts');

compileContract(solidityFilePath, abiDir, artifactsDir);