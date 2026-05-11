require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0000000000000000000000000000000000000000000000000000000000000001";

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    moonbaseAlpha: {
      url: "https://rpc.api.moonbase.moonbeam.network", 
      chainId: 1287,                                     
      accounts: [`0x${PRIVATE_KEY}`],                    
      gas: "auto",                                       
      gasPrice: "auto",                                  
    },
  },
  paths: {
    sources: "./contracts",
    scripts: "./scripts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};