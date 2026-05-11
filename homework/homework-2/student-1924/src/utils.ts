import { ethers } from "ethers";
import { createPublicClient, defineChain, http } from "viem";
import { ApiPromise, WsProvider } from "@polkadot/api";

export const EVM_RPC_URLS = [
  "https://westend-asset-hub-eth-rpc.polkadot.io",
  "https://westend-asset-hub-rpc.polkadot.io",
  "https://westend-asset-hub-rpc.dwellir.com",
] as const;
export const WS_RPC_URL = "wss://westend-asset-hub-rpc.polkadot.io";

export const westendAssetHub = defineChain({
  id: 420420421,
  name: "Westend Asset Hub",
  nativeCurrency: { name: "Westend", symbol: "WND", decimals: 18 },
  rpcUrls: { default: { http: [...EVM_RPC_URLS] } },
  testnet: true,
});

export function getEthersProvider(rpcUrl: string = EVM_RPC_URLS[0]) {
  return new ethers.JsonRpcProvider(rpcUrl);
}

export function getViemClient(rpcUrl: string = EVM_RPC_URLS[0]) {
  return createPublicClient({
    chain: westendAssetHub,
    transport: http(rpcUrl),
  });
}

export async function getPapiApi() {
  const provider = new WsProvider(WS_RPC_URL);
  return ApiPromise.create({ provider });
}