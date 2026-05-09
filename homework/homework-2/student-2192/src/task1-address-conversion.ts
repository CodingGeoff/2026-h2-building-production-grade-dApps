/**
 * Task 1: Address Conversion and Balance Verification
 *
 * This script demonstrates:
 * 1. Converting between SS58 (Substrate) and EVM addresses
 * 2. Checking balance consistency across both address formats
 * 3. Using both ethers.js and viem for EVM operations
 */

import { ethers } from "ethers";
import { createClient } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider';
import { hub } from '@polkadot-api/descriptors';
import { u8aToHex } from "@polkadot/util";
import { createPublicClient, http, Address } from 'viem';

// Import account utilities
import {
    getAlice,
    getBob,
    convertPublicKeyToSs58,
    accountId32ToH160,
    h160ToAccountId32,
    accountId32ToSs58,
    ss58ToEvmAddress,
    getRandomSubstrateKeypair
} from './accounts';

// Paseo Asset Hub configuration
const PASEO_RPC_URL = "https://paseo-rpc.dwellir.com";
const PASEO_WS_URL = "wss://asset-hub-paseo-rpc.polkadot.io";

/**
 * Get a Polkadot API client
 */
function getPolkadotApi() {
    return createClient(getWsProvider(PASEO_WS_URL)).getTypedApi(hub);
}

/**
 * Get an ethers provider
 */
function getEthersProvider() {
    return new ethers.JsonRpcProvider(PASEO_RPC_URL);
}

/**
 * Get a viem public client
 */
function getViemClient() {
    return createPublicClient({
        transport: http(PASEO_RPC_URL)
    });
}

/**
 * Test 1: Convert Alice's SS58 address to EVM and verify balance
 */
async function testAliceBalanceConversion() {
    console.log("\n=== Test 1: Alice Address Conversion & Balance ===\n");

    const api = getPolkadotApi();
    const ethersProvider = getEthersProvider();
    const viemClient = getViemClient();

    // Get Alice's keypair and SS58 address
    const alice = getAlice();
    const aliceSs58 = convertPublicKeyToSs58(alice.publicKey);
    console.log(`Alice SS58 address: ${aliceSs58}`);

    // Convert to EVM address
    const aliceEvmFromPk = accountId32ToH160(alice.publicKey);
    console.log(`Alice EVM address (from public key): ${aliceEvmFromPk}`);

    // Also demonstrate SS58 -> EVM conversion
    const aliceEvmFromSs58 = ss58ToEvmAddress(aliceSs58);
    console.log(`Alice EVM address (from SS58): ${aliceEvmFromSs58}`);

    // Check balance via Polkadot API (SS58)
    console.log("\n--- Checking balance via Polkadot API ---");
    const substrateBalance = await api.query.System.Account.getValue(aliceSs58);
    console.log(`Substrate balance (free): ${substrateBalance.data.free.toString()}`);
    console.log(`Substrate balance (reserved): ${substrateBalance.data.reserved.toString()}`);

    // Check balance via ethers (EVM)
    console.log("\n--- Checking balance via ethers ---");
    try {
        const ethersBalance = await ethersProvider.getBalance(aliceEvmFromPk);
        console.log(`Ethers balance: ${ethers.formatEther(ethersBalance)} ETH`);
    } catch (error) {
        console.log(`Ethers balance check failed (expected on pure Substrate): ${error}`);
    }

    // Check balance via viem (EVM)
    console.log("\n--- Checking balance via viem ---");
    try {
        const viemBalance = await viemClient.getBalance({ address: aliceEvmFromPk as Address });
        console.log(`Viem balance: ${ethers.formatEther(viemBalance.toString())} ETH`);
    } catch (error) {
        console.log(`Viem balance check failed (expected on pure Substrate): ${error}`);
    }

    // Verify conversions are consistent
    console.log("\n--- Conversion Verification ---");
    console.log(`SS58 -> EVM -> SS58 roundtrip test:`);
    const evmAddress = aliceEvmFromPk;
    const accountId = h160ToAccountId32(evmAddress);
    const roundtripSs58 = accountId32ToSs58(accountId);
    console.log(`Original SS58: ${aliceSs58}`);
    console.log(`Roundtrip SS58: ${roundtripSs58}`);
    console.log(`Match: ${aliceSs58 === roundtripSs58}`);
}

/**
 * Test 2: Generate a random account and check balance
 */
async function testRandomAccount() {
    console.log("\n=== Test 2: Random Account Balance ===\n");

    const api = getPolkadotApi();

    // Generate random keypair
    const keypair = getRandomSubstrateKeypair();
    const ss58Address = convertPublicKeyToSs58(keypair.publicKey);
    const evmAddress = accountId32ToH160(keypair.publicKey);

    console.log(`Random SS58 address: ${ss58Address}`);
    console.log(`Random EVM address: ${evmAddress}`);

    // Check substrate balance
    const substrateBalance = await api.query.System.Account.getValue(ss58Address);
    console.log(`Substrate balance: ${substrateBalance.data.free.toString()}`);

    // The EVM balance should match (on chains with EVM support)
    const ethersProvider = getEthersProvider();
    try {
        const evmBalance = await ethersProvider.getBalance(evmAddress);
        console.log(`EVM balance: ${ethers.formatEther(evmBalance)} ETH`);
    } catch (error) {
        console.log(`EVM balance check not available: ${error}`);
    }
}

/**
 * Test 3: Demonstrate eth-derived address conversion
 */
async function testEthDerivedAddress() {
    console.log("\n=== Test 3: EVM-derived Address (0xEE prefix) ===\n");

    // Example EVM address
    const evmAddress = "0x7072056494a815425895c743e50c37a1b232a00a";
    console.log(`EVM address: ${evmAddress}`);

    // Convert to AccountId32 (eth-derived format)
    const accountId = h160ToAccountId32(evmAddress);
    console.log(`AccountId32 (hex): ${u8aToHex(accountId)}`);

    // Convert to SS58
    const ss58Address = accountId32ToSs58(accountId);
    console.log(`SS58 address: ${ss58Address}`);
}

/**
 * Main test runner
 */
async function main() {
    console.log("=".repeat(60));
    console.log("Polkadot Testnet - Address Conversion & Balance Verification");
    console.log("=".repeat(60));

    try {
        await testAliceBalanceConversion();
        await testRandomAccount();
        await testEthDerivedAddress();

        console.log("\n" + "=".repeat(60));
        console.log("All tests completed!");
        console.log("=".repeat(60));
    } catch (error) {
        console.error("Error during testing:", error);
    }
}

// Run the tests
main();
