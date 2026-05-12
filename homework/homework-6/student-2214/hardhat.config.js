require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("solidity-coverage");
require("dotenv").config();
require("hardhat-contract-sizer");

function getAccountsFromEnv(envKey) {
  const rawKey = process.env[envKey] || "";
  if (!rawKey) return [];
  const normalized = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;
  if (normalized.length !== 66) return [];
  return [normalized];
}

// 配置hardhat accounts参数
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});



/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.22",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1
          },
          viaIR: true,
          metadata: {
            bytecodeHash: "none"
          }
        }
      },
      {
        version: "0.8.25",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1
          },
          viaIR: true,
          metadata: {
            bytecodeHash: "none"
          }
        }
      },
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000
          },
          viaIR: true
        }
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1
          },
          viaIR: true,
          metadata: {
            bytecodeHash: "none"
          }
        }
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.6.2",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.5.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.5.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.4.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.4.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
    ],
   
    overrides: {
      "contracts/ServerNodeV2Backup.sol": {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1
          },
          viaIR: true,
          metadata: {
            bytecodeHash: "none"
          },
          debug: {
            revertStrings: "strip"
          }
        }
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    polkadotTestnet: {
      url: process.env.POLKADOT_TESTNET_RPC_URL || "",
      accounts: getAccountsFromEnv("PRIVATE_KEY"),
      chainId: parseInt(process.env.POLKADOT_TESTNET_CHAIN_ID) || 420420417,
    },
    polkadotMainnet: {
      url: process.env.POLKADOT_MAINNET_RPC_URL || "",
      accounts: getAccountsFromEnv("PRIVATE_KEY"),
      chainId: parseInt(process.env.POLKADOT_MAINNET_CHAIN_ID) || 420420419,
    }
  },
  etherscan: {
    enabled: true,
    // 使用新的 v2 API 配置
    apiKey: {
      monadMainnet: process.env.ETHERSCAN_API_KEY,
      monadTestnet: process.env.ETHERSCAN_API_KEY,
      bsc: process.env.BSC_SCAN_BACKUP_API_KEY,
      bscTestnet: process.env.BSC_SCAN_BACKUP_API_KEY,
      sepolia: process.env.ETHERSCAN_API_KEY,
      beechainMainnet: process.env.BEECHAIN_API_KEY,
      arbitrumSepolia: process.env.ETHERSCAN_API_KEY,
      baseSepolia: process.env.ETHERSCAN_API_KEY,
      moonbaseAlphaTestnet: process.env.ETHERSCAN_API_KEY,
      moonbeamMainnet: process.env.ETHERSCAN_API_KEY,
      polkadotTestnet: process.env.POLKADOT_ETHERSCAN_API_KEY,
      polkadotMainnet: process.env.POLKADOT_ETHERSCAN_API_KEY
    },
    customChains: [
      {
        network: 'polkadotTestnet',
        chainId: parseInt(process.env.POLKADOT_TESTNET_CHAIN_ID),
        urls: {
          apiURL: process.env.POLKADOT_TESTNET_BLOCKSCOUT_API_URL,
          browserURL: process.env.POLKADOT_TESTNET_ETHERSCAN_URL
        },
      },
      {
        network: 'polkadotMainnet',
        chainId: parseInt(process.env.POLKADOT_MAINNET_CHAIN_ID),
        urls: {
          apiURL: process.env.POLKADOT_MAINNET_BLOCKSCOUT_API_URL,
          browserURL: process.env.POLKADOT_MAINNET_ETHERSCAN_URL
        },
      }
    ]
  },
  // 覆盖率配置
  coverage: {
    enabled: true,
    exclude: ['test/', 'node_modules/', 'coverage/', 'scripts/'],
    reporter: ['html', 'lcov', 'text', 'json'],
    solcoverjs: './.solcover.js',
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    currency: 'USD',
    gasPrice: 20, // Gwei
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    token: 'ETH',
    outputFile: 'gas-report.txt',
    noColors: true,
    // 排除一些测试文件
    excludeContracts: ['Test', 'Mock'],
  },
  mocha: {
    timeout: 40000
  },
  sourcify: {
    enabled: false,
    apiUrl: "https://sourcify.dev/server/",
    browserUrl: "https://sourcify.dev"
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
