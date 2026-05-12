// hardhat.config.js
// ================================================================
// 波卡生态 Uniswap V2 完整 Hardhat 配置
// 支持：本地节点、Paseo Asset Hub TestNet、Moonbase Alpha
// ================================================================

require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || 
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  // ============================================================
  // Solidity 编译器配置
  // 注意：Uniswap V2 核心用 0.5.16，Router 用 0.6.6，WETH 用 0.4.18
  // 需要配置多版本编译器！
  // ============================================================
  solidity: {
    compilers: [
      {
        version: "0.4.18",  // WETH 合约
        settings: {
          optimizer: { enabled: true, runs: 999999 }
        }
      },
      {
        version: "0.5.16",  // Uniswap V2 Core
        settings: {
          optimizer: { enabled: true, runs: 999999 }
        }
      },
      {
        version: "0.6.6",   // Uniswap V2 Periphery (Router)
        settings: {
          optimizer: { enabled: true, runs: 999999 }
        }
      },
      {
        version: "0.8.20",  // 测试代币 & 互操作合约
        settings: {
          optimizer: { enabled: true, runs: 200 }
        }
      }
    ]
  },

  // ============================================================
  // 网络配置
  // ============================================================
  networks: {
    // ----------------------------------------------------------
    // 1. Hardhat 本地网络（默认，最快，用于单元测试）
    // ----------------------------------------------------------
    hardhat: {
      chainId: 31337,
      gas: "auto",
      gasPrice: "auto",
      blockGasLimit: 30000000,  // 3000万，确保大合约能部署
      allowUnlimitedContractSize: true,  // 开发阶段允许大合约
      accounts: {
        count: 10,
        initialIndex: 0,
        // Hardhat 内置10个测试账户，每个都有 10000 ETH
      }
    },

    // ----------------------------------------------------------
    // 2. Polkadot Hub TestNet (Paseo Asset Hub)
    //    EVM 路径，无需 polkavm:true
    // ----------------------------------------------------------
    passetHub: {
      url: "https://testnet-passet-hub-eth-rpc.polkadot.io",
      chainId: 420420417,
      accounts: [PRIVATE_KEY],
      gas: "auto",
      gasPrice: "auto",
      timeout: 120000  // 120秒超时，波卡出块时间较长
    },

    // ----------------------------------------------------------
    // 3. Moonbase Alpha（Moonbeam 测试网，用于 Part 2 预编译）
    // ----------------------------------------------------------
    moonbaseAlpha: {
      url: "https://rpc.api.moonbase.moonbeam.network",
      chainId: 1287,
      accounts: [PRIVATE_KEY],
      gas: "auto",
      gasPrice: "auto"
    },

    // ----------------------------------------------------------
    // 4. 本地 Substrate 节点（如果你跑了本地节点）
    // ----------------------------------------------------------
    localNode: {
      url: "http://127.0.0.1:8545",
      chainId: 420420420,
      accounts: [PRIVATE_KEY],
      gas: "auto"
    }
  },

  // ============================================================
  // Mocha 测试超时配置（波卡出块慢，需要更长超时）
  // ============================================================
  mocha: {
    timeout: 120000  // 120秒
  },

  // ============================================================
  // 路径配置
  // ============================================================
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};