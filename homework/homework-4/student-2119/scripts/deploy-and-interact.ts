import { artifacts, network } from "hardhat";
import type { Hex } from "viem";

import { deployContractAndWait } from "./deploy-helper.ts";

async function main() {
  const { viem } = await network.create();

  const [publicClient, walletClients, artifact] = await Promise.all([
    viem.getPublicClient(),
    viem.getWalletClients(),
    artifacts.readArtifact("SimpleStorage"),
  ]);
  const [walletClient] = walletClients;

  if (walletClient === undefined) {
    throw new Error("No wallet client is available for deployment.");
  }

  const { contract, hash, receipt } = await deployContractAndWait({
    abi: artifact.abi,
    bytecode: artifact.bytecode as Hex,
    contractName: "SimpleStorage",
    getContractAt: (name, address) => viem.getContractAt(name, address),
    publicClient,
    walletClient,
  });

  console.log("Deployed SimpleStorage at", contract.address);
  console.log("Deploy tx:", hash);
  console.log("Block:", receipt.blockNumber.toString());

  const before = await contract.read.retrieve();
  console.log("retrieve() before store:", before.toString());

  const storeHash = await contract.write.store([2119n]);
  console.log("store(2119) tx:", storeHash);

  await publicClient.waitForTransactionReceipt({ hash: storeHash });

  const after = await contract.read.retrieve();
  console.log("retrieve() after store:", after.toString());
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
