const { ethers } = require("ethers");
const fs = require("fs");

async function main() {
    // 1. 连接到区块链 (Connect to Blockchain)
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    console.log("1. Connected to blockchain at http://127.0.0.1:8545");

    // 2. 基本数据查询 (Query Basic Data)
    const blockNumber = await provider.getBlockNumber();
    console.log(`Current Block Number: ${blockNumber}`);

    // 获取 Ganache 的第一个账户 (Get first account from Ganache)
    const accounts = await provider.listAccounts();
    const address1 = accounts[0].address;
    const balance1 = await provider.getBalance(address1);
    console.log(`Balance of Account 0 (${address1}): ${ethers.formatEther(balance1)} ETH`);

    // 3. 交易发送 (Send Transaction)
    // 注意：Ganache 账户不需要私钥即可通过 provider.getSigner() 发送交易（如果未锁定）
    // 但为了演示，我们还是使用私钥（从日志中获取）
    // 自动获取私钥比较难，所以我直接硬编码刚才日志里的第一个私钥
    const privateKey = "0x068bf9befdb812484e1caea1845f04a2af6d008bf43aeea96ebed5fcba1bbfab";
    const wallet = new ethers.Wallet(privateKey, provider);

    const address2 = accounts[1].address;
    console.log(`\nSending 1 ETH from Account 0 to Account 1 (${address2})...`);
    const tx = await wallet.sendTransaction({
        to: address2,
        value: ethers.parseEther("1.0"),
    });
    console.log(`Transaction Hash: ${tx.hash}`);
    await tx.wait();
    console.log("Transaction confirmed!");

    const balance2 = await provider.getBalance(address2);
    console.log(`New Balance of Account 1: ${ethers.formatEther(balance2)} ETH`);

    // 4. 智能合约的部署 (Deploy Smart Contract)
    console.log("\nDeploying SimpleStorage contract...");
    const contractData = JSON.parse(fs.readFileSync("./SimpleStorage.json", "utf8"));
    const factory = new ethers.ContractFactory(contractData.abi, contractData.bytecode, wallet);
    const contract = await factory.deploy();
    console.log("Waiting for deployment...");
    const receipt = await contract.deploymentTransaction().wait();
    const contractAddress = receipt.contractAddress;
    console.log(`Contract deployed to: ${contractAddress}`);
    
    // 重新实例化合约以确保地址正确 (Re-instantiate contract to ensure correct address)
    const deployedContract = new ethers.Contract(contractAddress, contractData.abi, wallet);

    const code = await provider.getCode(contractAddress);
    console.log(`Code at address (first 50 chars): ${code.slice(0, 50)}...`);
    if (code === "0x" || code === "0x0") {
        console.error("ERROR: No code found at the deployed address!");
        process.exit(1);
    }

    // 5. 状态读取 (Read State)
    console.log("Reading initial value...");
    let value = await deployedContract.getValue();
    console.log(`Initial Contract Value: ${value.toString()}`);

    // 6. 状态更新 (Update State)
    console.log("Updating Contract Value to 42...");
    const updateTx = await deployedContract.setValue(42);
    await updateTx.wait();
    console.log("Contract update confirmed!");

    value = await deployedContract.getValue();
    console.log(`Updated Contract Value: ${value.toString()}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
