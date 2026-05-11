import { ethers } from "ethers";
import fs from "fs";

async function main() {
  console.log("--- Connecting to Blockchain ---");
  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const network = await provider.getNetwork();
  console.log("Connected to network:", network.name);

  // Hardhat's default account 0 and 1
  const sender = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
  const receiver = new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider);

  console.log("\n--- Basic Data Query ---");
  const blockNumber = await provider.getBlockNumber();
  console.log("Current block number:", blockNumber);

  const senderBalance = await provider.getBalance(sender.address);
  console.log(`Sender (${sender.address}) balance:`, ethers.formatEther(senderBalance), "ETH");

  console.log("\n--- Transaction Sending ---");
  const transferAmount = ethers.parseEther("1.5");
  console.log(`Sending 1.5 ETH from ${sender.address} to ${receiver.address}...`);
  
  const tx = await sender.sendTransaction({
    to: receiver.address,
    value: transferAmount,
  });
  
  await tx.wait();
  console.log("Transaction confirmed in block:", tx.blockNumber);
  
  const receiverBalance = await provider.getBalance(receiver.address);
  console.log(`Receiver (${receiver.address}) balance:`, ethers.formatEther(receiverBalance), "ETH");

  console.log("\n--- Smart Contract Deployment ---");
  const artifactStr = fs.readFileSync("./artifacts/contracts/SimpleStorage.sol/SimpleStorage.json", "utf-8");
  const artifact = JSON.parse(artifactStr);
  
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, receiver);
  const simpleStorage = await factory.deploy();
  await simpleStorage.waitForDeployment();
  const contractAddress = await simpleStorage.getAddress();
  console.log("SimpleStorage deployed to:", contractAddress);

  console.log("\n--- State Reading and Updating ---");
  // The contract object
  const contract = new ethers.Contract(contractAddress, artifact.abi, receiver);
  
  const initialValue = await contract.retrieve();
  console.log("Initial value in SimpleStorage:", initialValue.toString());

  console.log("Updating value to 42...");
  const nonce = await provider.getTransactionCount(receiver.address);
  const updateTx = await contract.store(42n, { nonce });
  await updateTx.wait();
  console.log("Value updated!");

  const updatedValue = await contract.retrieve();
  console.log("Updated value in SimpleStorage:", updatedValue.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
