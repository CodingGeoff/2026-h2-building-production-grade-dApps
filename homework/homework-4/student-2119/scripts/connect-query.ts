import "dotenv/config";
import { createPublicClient, formatEther, http } from "viem";
import type { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { polkadotHubTestnet } from "./chain.ts";

async function main() {
  const rpcUrl =
    process.env.RPC_URL !== undefined && process.env.RPC_URL !== ""
      ? process.env.RPC_URL
      : polkadotHubTestnet.rpcUrls.default.http[0];

  const publicClient = createPublicClient({
    chain: polkadotHubTestnet,
    transport: http(rpcUrl),
  });

  const chainId = await publicClient.getChainId();
  const blockNumber = await publicClient.getBlockNumber();
  const gasPrice = await publicClient.getGasPrice();

  console.log("chainId:", chainId);
  console.log("latest block number:", blockNumber.toString());
  console.log("gasPrice (wei):", gasPrice.toString());

  const pk = process.env.PRIVATE_KEY;
  if (pk !== undefined && pk !== "") {
    const account = privateKeyToAccount(pk as Hex);
    const balance = await publicClient.getBalance({ address: account.address });
    console.log("address:", account.address);
    console.log("balance:", formatEther(balance), polkadotHubTestnet.nativeCurrency.symbol);
  } else {
    console.log("(Skip balance: PRIVATE_KEY not set)");
  }
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
