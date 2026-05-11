import { ethers } from "ethers";
import {
    accountId32ToH160,
    convertPublicKeyToSs58,
    getAlice,
} from "./accounts";
import { getApi, getProvider } from "./utils";
import { callIdentityPrecompile } from "./precompile";

/**
 * Homework 2 — Polkadot testnet (Asset Hub Paseo via utils getProvider/getApi false).
 * 1) Address conversion + compare Substrate free vs EVM balance.
 * 2) Call identity precompile on the same JSON-RPC.
 */
async function taskAddressAndBalance() {
    console.log("\n--- Task 1: SS58 / H160 conversion & balance check ---\n");

    const api = getApi(false);
    const provider = getProvider(false);
    const alice = getAlice();

    const ss58 = convertPublicKeyToSs58(alice.publicKey);
    const h160 = accountId32ToH160(alice.publicKey);

    console.log("Alice SS58:", ss58);
    console.log("Alice H160:", h160);

    const account = await api.query.System.Account.getValue(ss58);
    const subFree = account.data.free;
    const evmWei = await provider.getBalance(h160);

    console.log("Substrate System.Account.data.free (smallest unit):", subFree.toString());
    console.log("EVM native balance (wei):                     ", evmWei.toString());
    console.log("EVM native balance (ether):                     ", ethers.formatEther(evmWei));

    if (subFree === evmWei) {
        console.log("\nBalances match for this mapped account.");
    } else {
        console.log(
            "\nBalances differ (new account, no EVM mapping, or RPC lag). Diff (substrate - evm):",
            (subFree - evmWei).toString(),
        );
    }
}

async function taskPrecompile() {
    console.log("\n--- Task 2: Identity precompile eth_call ---\n");

    const provider = getProvider(false);
    await callIdentityPrecompile(provider);
}

async function main() {
    await taskAddressAndBalance();
    await taskPrecompile();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
