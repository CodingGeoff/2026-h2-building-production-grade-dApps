import { ethers } from "ethers";
import { createPublicClient, defineChain, http } from "viem";
import { ApiPromise, WsProvider } from "@polkadot/api";

export const EVM_RPC_URLS = [
  "https://eth-rpc-testnet.polkadot.io/",
  "https://services.polkadothub-rpc.com/testnet/",
] as const;

export const WS_RPC_URL = "wss://asset-hub-paseo-rpc.n.dwellir.com";

export const polkadotHubTestnet = defineChain({
  id: 420420417,
  name: "Polkadot Hub TestNet",
  nativeCurrency: { name: "Paseo", symbol: "PAS", decimals: 18 },
  rpcUrls: { default: { http: [...EVM_RPC_URLS] } },
  testnet: true,
});

export function getEthersProvider(rpcUrl: string = EVM_RPC_URLS[0]) {
  return new ethers.JsonRpcProvider(rpcUrl);
}

export function getViemClient(rpcUrl: string = EVM_RPC_URLS[0]) {
  return createPublicClient({
    chain: polkadotHubTestnet,
    transport: http(rpcUrl),
  });
}

export async function getPapiApi() {
  const provider = new WsProvider(WS_RPC_URL);
  return ApiPromise.create({ provider });
}
