# Homework 4 - Blockchain Interaction with Ethers.js

This directory contains the solution for Homework 4 using `ethers` v6.

## Requirements Covered
- **Connect to Blockchain**: Connects to the local Hardhat node via JSON-RPC.
- **Basic Data Query**: Retrieves current block number and account balances.
- **Transaction Sending**: Sends 1.5 ETH from one account to another.
- **Smart Contract Deployment**: Deploys `SimpleStorage.sol` via `ethers.ContractFactory`.
- **State Reading and Updating**: Interacts with the deployed `SimpleStorage` contract to read the state (`retrieve()`), update the state (`store(42)`), and verify the updated state.

## How to Run

1. **Install Dependencies**
   Navigate to this directory and install dependencies:
   ```bash
   npm install
   ```

2. **Start Local Hardhat Node**
   In one terminal window, start the local node:
   ```bash
   npx hardhat node
   ```

3. **Compile the Smart Contract**
   In a new terminal window, compile the solidity contract:
   ```bash
   npx hardhat compile
   ```

4. **Run the Script**
   Execute the interaction script:
   ```bash
   npx ts-node --esm scripts/main.ts
   ```
