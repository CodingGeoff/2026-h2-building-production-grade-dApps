import { getAddress, getBytes, keccak256 } from "ethers";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";
import { createPublicClient, defineChain, http, formatEther } from "viem";
import { getWsProvider } from 'polkadot-api/ws-provider';
import { createClient } from 'polkadot-api';
import { hub } from '@polkadot-api/descriptors';

const SS58_PREFIX = 42;

const EVM_RPC_URLS = [
  "https://westend-asset-hub-eth-rpc.polkadot.io",
  "https://westend-asset-hub-rpc.polkadot.io",
  "https://westend-asset-hub-rpc.dwellir.com",
] as const;
const WS_RPC_URL = "wss://westend-asset-hub-rpc.polkadot.io";

const westendAssetHub = defineChain({
  id: 420420421,
  name: "Westend Asset Hub",
  nativeCurrency: { name: "Westend", symbol: "WND", decimals: 18 },
  rpcUrls: { default: { http: [...EVM_RPC_URLS] } },
  testnet: true,
});

function isEthDerivedAccountId32(accountId: Uint8Array): boolean {
  if (accountId.length !== 32) return false;
  for (let i = 20; i < 32; i += 1) {
    if (accountId[i] !== 0xee) return false;
  }
  return true;
}

export function h160ToAccountId32(h160: string): Uint8Array {
  const normalized = getAddress(h160);
  const h160Bytes = getBytes(normalized);
  const out = new Uint8Array(32);
  out.fill(0xee);
  out.set(h160Bytes, 0);
  return out;
}

export function accountId32ToH160(accountId32: Uint8Array): string {
  if (accountId32.length !== 32) {
    throw new Error(`AccountId32 must be 32 bytes, got ${accountId32.length}`);
  }
  if (isEthDerivedAccountId32(accountId32)) {
    return getAddress(`0x${Buffer.from(accountId32.slice(0, 20)).toString("hex")}`);
  }
  const hash = getBytes(keccak256(accountId32));
  return getAddress(`0x${Buffer.from(hash.slice(12)).toString("hex")}`);
}

export function h160ToSs58(h160: string): string {
  return encodeAddress(h160ToAccountId32(h160), SS58_PREFIX);
}

export function ss58ToH160(ss58: string): string {
  return accountId32ToH160(decodeAddress(ss58));
}

const EVM_DECIMALS = 18n;
const SUBSTRATE_DECIMALS = 12n;

function scaleSubstrateToEvmUnits(value: bigint): bigint {
  if (EVM_DECIMALS < SUBSTRATE_DECIMALS) {
    return value / 10n ** (SUBSTRATE_DECIMALS - EVM_DECIMALS);
  }
  return value * 10n ** (EVM_DECIMALS - SUBSTRATE_DECIMALS);
}

async function main() {
  const TEST_H160 = "0x5c434e203265949d679ec97b950dacf4e4d2e17e";

  console.log("=== Task1: Address convert + balance consistency ===");
  console.log("Network: Westend Asset Hub testnet\n");

  const ss58 = h160ToSs58(TEST_H160);
  const roundTripH160 = ss58ToH160(ss58);

  console.log("[Address conversion]");
  console.log("H160:       ", TEST_H160);
  console.log("SS58:       ", ss58);
  console.log("SS58->H160: ", roundTripH160);
  const roundTripPass = roundTripH160.toLowerCase() === getAddress(TEST_H160).toLowerCase();
  console.log("Round-trip: ", roundTripPass ? "PASS" : "FAIL");

  const viemClient = createPublicClient({
    chain: westendAssetHub,
    transport: http(EVM_RPC_URLS[0]),
  });

  const api = createClient(getWsProvider(WS_RPC_URL)).getTypedApi(hub);

  console.log("\n[Balance query]");
  const viemBal = await viemClient.getBalance({ address: TEST_H160 as `0x${string}` });
  const accountInfo = await api.query.System.Account.getValue(ss58);
  const substrateFree = accountInfo.data.free;
  const substrateAsEvmUnit = scaleSubstrateToEvmUnits(substrateFree);

  console.log("viem balance   (wei):   ", viemBal.toString());
  console.log("PAPI free   (planck):   ", substrateFree.toString());
  console.log("PAPI scaled  (wei):      ", substrateAsEvmUnit.toString());
  console.log("viem formatted:          ", formatEther(viemBal), "WND");

  console.log("\n[Consistency check]");
  const diff = viemBal >= substrateAsEvmUnit ? viemBal - substrateAsEvmUnit : substrateAsEvmUnit - viemBal;
  const tolerance = 10n ** 16n;
  const substrateClose = diff <= tolerance;

  console.log("EVM vs PAPI (scaled, tolerance=0.01):", substrateClose ? "PASS" : "FAIL");
  console.log("difference (wei):", diff.toString());

  console.log("\n=== Done ===");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
