import { ethers } from "ethers";
import { createHash } from "node:crypto";
import { EVM_RPC_URLS, getEthersProvider, getViemClient } from "./utils";

const SHA256_PRECOMPILE = "0x0000000000000000000000000000000000000002";

async function main() {
  console.log("=== Task2: Precompile call ===");
  console.log("Network: Westend Asset Hub testnet");
  console.log("Precompile:", SHA256_PRECOMPILE, "(SHA256)");

  const inputUtf8 = "hello-polkadot-testnet";
  const inputHex = `0x${Buffer.from(inputUtf8, "utf8").toString("hex")}` as `0x${string}`;

  console.log("\nInput text:", inputUtf8);
  console.log("Input hex :", inputHex);

  let ethersOut: string | null = null;
  let viemOut: `0x${string}` | null = null;
  let ethersRpcUsed: string | null = null;
  let viemRpcUsed: string | null = null;
  const attemptLogs: string[] = [];

  for (const rpcUrl of EVM_RPC_URLS) {
    const ethersProvider = getEthersProvider(rpcUrl);
    try {
      const out = await ethersProvider.call({
        to: SHA256_PRECOMPILE,
        data: inputHex,
      });
      ethersOut = out;
      ethersRpcUsed = rpcUrl;
      break;
    } catch (err) {
      attemptLogs.push(`ethers failed @ ${rpcUrl}: ${(err as Error).message}`);
    }
  }

  for (const rpcUrl of EVM_RPC_URLS) {
    const viemClient = getViemClient(rpcUrl);
    try {
      const result = await viemClient.call({
        to: SHA256_PRECOMPILE as `0x${string}`,
        data: inputHex,
      });
      viemOut = result.data ?? null;
      viemRpcUsed = rpcUrl;
      break;
    } catch (err) {
      attemptLogs.push(`viem failed @ ${rpcUrl}: ${(err as Error).message}`);
    }
  }

  if (attemptLogs.length > 0) {
    console.log("\n[Fallback attempts]");
    for (const log of attemptLogs) console.log("-", log);
  }

  const localSha256 = `0x${createHash("sha256").update(inputUtf8).digest("hex")}`;

  console.log("\nethers output:", ethersOut ?? "(no result)");
  console.log("ethers rpc   :", ethersRpcUsed ?? "(none succeeded)");
  console.log("viem output  :", viemOut ?? "(no result)");
  console.log("viem rpc     :", viemRpcUsed ?? "(none succeeded)");
  console.log("local sha256 :", localSha256);

  const ethersOk = (ethersOut ?? "").toLowerCase() === localSha256.toLowerCase();
  const viemOk = (viemOut ?? "").toLowerCase() === localSha256.toLowerCase();
  console.log("\nVerification:");
  console.log("ethers == sha256 :", ethersOk ? "PASS" : "FAIL");
  console.log("viem   == sha256 :", viemOk ? "PASS" : "FAIL");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });