require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");

// Only load dotenv if the file exists
const fs = require("fs");
if (fs.existsSync(".env")) {
  require("dotenv").config();
}

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    version: "0.5.16",
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

// Only add sepolia and mumbai networks if PRIVATE_KEY is set
if (process.env.PRIVATE_KEY) {
  config.networks.sepolia = {
    url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    accounts: [process.env.PRIVATE_KEY],
  };

  config.networks.mumbai = {
    url: process.env.MUMBAI_RPC_URL || "https://rpc-mumbai.maticvigil.com",
    accounts: [process.env.PRIVATE_KEY],
    chainId: 80001,
  };
}

module.exports = config;