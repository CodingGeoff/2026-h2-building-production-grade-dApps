import { ethers } from "ethers";
import { getWsProvider } from 'polkadot-api/ws-provider';
import { createClient, TypedApi } from 'polkadot-api';
import { hub } from '@polkadot-api/descriptors';
import { getPolkadotSigner } from "polkadot-api/signer";
import { getAlice } from './accounts';

// Polkadot Asset Hub Paseo testnet
const HUB_URL = "https://polkadot-asset-hub.polkadot.io";
const HUB_WS_URL = "wss://asset-hub-paseo-rpc.polkadot.io";

// Local node URLs (for testing with substrate-contracts-node or moonbeam)
const LOCAL_HTTP_URL = "http://localhost:8545";
const LOCAL_WS_URL = "ws://localhost:9944";

/**
 * Get an ethers provider for EVM RPC calls
 */
export function getProvider(isLocal: boolean = false): ethers.JsonRpcProvider {
    if (isLocal) {
        return new ethers.JsonRpcProvider(LOCAL_HTTP_URL);
    } else {
        // Use a public RPC endpoint for Asset Hub Paseo
        return new ethers.JsonRpcProvider("https://paseo-rpc.dwellir.com");
    }
}

/**
 * Get a Polkadot API client for Substrate calls
 */
export function getApi(isLocal: boolean = false): TypedApi<typeof hub> {
    const wsUrl = isLocal ? LOCAL_WS_URL : HUB_WS_URL;
    return createClient(getWsProvider(wsUrl)).getTypedApi(hub);
}

/**
 * Set balance for an account (requires sudo privileges)
 */
export async function setBalance(ss58Address: string, balance: bigint) {
    const api = getApi(true);
    const alice = getAlice();
    const polkadotSigner = getPolkadotSigner(
        alice.publicKey,
        "Sr25519",
        alice.sign,
    );

    const innerCall = api.tx.Balances.force_set_balance({
        who: { type: "Id", value: ss58Address },
        new_free: balance
    });
    const tx = api.tx.Sudo.sudo({ call: innerCall.decodedCall });
    const hash = await tx.signAndSubmit(polkadotSigner);
    console.log(`Transaction hash: ${hash}`);
}

/**
 * Helper to delay execution
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
