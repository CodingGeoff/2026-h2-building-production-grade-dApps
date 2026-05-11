import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  parseEther,
} from "viem";
import type { Address, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { polkadotHubTestnet } from "./chain.ts";

async function main() {
  const pk = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.RPC_URL;
  const to = process.env.TO_ADDRESS as Address | undefined;

  if (pk === undefined || pk === "") {
    throw new Error("PRIVATE_KEY is required.");
  }
  if (rpcUrl === undefined || rpcUrl === "") {
    throw new Error("RPC_URL is required.");
  }
  if (to === undefined || to === "") {
    throw new Error("TO_ADDRESS is required (recipient for native token transfer).");
  }

  const account = privateKeyToAccount(pk as Hex);
  const transport = http(rpcUrl);

  const publicClient = createPublicClient({
    chain: polkadotHubTestnet,
    transport,
  });

  const walletClient = createWalletClient({
    account,
    chain: polkadotHubTestnet,
    transport,
  });

  const amount = parseEther(process.env.TRANSFER_AMOUNT ?? "0.001");

  const balanceBefore = await publicClient.getBalance({ address: account.address });
  console.log("from:", account.address);
  console.log("balance before:", formatEther(balanceBefore));

  const hash = await walletClient.sendTransaction({
    account,
    to,
    value: amount,
  });
  console.log("tx hash:", hash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log("status:", receipt.status);

  const balanceAfter = await publicClient.getBalance({ address: account.address });
  console.log("balance after:", formatEther(balanceAfter));
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
