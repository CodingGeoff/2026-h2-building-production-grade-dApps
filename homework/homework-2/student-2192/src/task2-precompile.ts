/**
 * Task 2: Precompile Contract Calls
 *
 * This script demonstrates calling EVM precompiles on Polkadot:
 * 1. Identity precompile (0x04) - data copy
 * 2. RIPEMD160 precompile (0x03) - hashing
 * 3. ECRecover precompile (0x01) - signature recovery
 *
 * Precompiles are special contracts built into the EVM for common operations.
 */

import { ethers } from "ethers";
import { createPublicClient, http, Address } from 'viem';

// Configuration
const PASEO_RPC_URL = "https://paseo-rpc.dwellir.com";

// Precompile addresses (standard EVM precompiles)
const IDENTITY_PRECOMPILE = "0x0000000000000000000000000000000000000004";
const RIPEMD160_PRECOMPILE = "0x0000000000000000000000000000000000000003";
const ECRecover_PRECOMPILE = "0x0000000000000000000000000000000000000001";
const SHA256_PRECOMPILE = "0x0000000000000000000000000000000000000002";

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
 * Call a precompile using ethers.js
 */
async function callPrecompileWithEthers(
    provider: ethers.JsonRpcProvider,
    precompileAddress: string,
    data: string,
    label: string
) {
    console.log(`\n--- ${label} (ethers) ---`);
    console.log(`Precompile address: ${precompileAddress}`);
    console.log(`Input data: ${data}`);

    try {
        const result = await provider.call({
            to: precompileAddress,
            data: data
        });
        console.log(`Result: ${result}`);
        return result;
    } catch (error) {
        console.log(`Error: ${error}`);
        throw error;
    }
}

/**
 * Call a precompile using viem
 */
async function callPrecompileWithViem(
    client: any,
    precompileAddress: string,
    data: string,
    label: string
) {
    console.log(`\n--- ${label} (viem) ---`);
    console.log(`Precompile address: ${precompileAddress}`);
    console.log(`Input data: ${data}`);

    try {
        const result = await client.call({
            to: precompileAddress as Address,
            data: data as Address
        });
        console.log(`Result: ${result.data}`);
        return result.data;
    } catch (error) {
        console.log(`Error: ${error}`);
        throw error;
    }
}

/**
 * Test 1: Identity Precompile (data copy)
 * Returns the input data unchanged
 */
async function testIdentityPrecompile() {
    console.log("\n" + "=".repeat(60));
    console.log("Test 1: Identity Precompile (0x04)");
    console.log("=".repeat(60));

    const ethersProvider = getEthersProvider();
    const viemClient = getViemClient();

    // Test data - must be padded to 32-byte boundary for EVM
    const testData = "0x48656c6c6f20576f726c64"; // "Hello World" in hex

    // Using ethers
    await callPrecompileWithEthers(
        ethersProvider,
        IDENTITY_PRECOMPILE,
        testData,
        "Identity Precompile"
    );

    // Using viem
    await callPrecompileWithViem(
        viemClient,
        IDENTITY_PRECOMPILE,
        testData,
        "Identity Precompile"
    );
}

/**
 * Test 2: RIPEMD160 Precompile
 * Computes RIPEMD160 hash of input data
 */
async function testRipemd160Precompile() {
    console.log("\n" + "=".repeat(60));
    console.log("Test 2: RIPEMD160 Precompile (0x03)");
    console.log("=".repeat(60));

    const ethersProvider = getEthersProvider();
    const viemClient = getViemClient();

    // Test data - "test" in hex, padded
    const testData = "0x7465737400000000000000000000000000000000000000000000000000000000";

    // Using ethers
    await callPrecompileWithEthers(
        ethersProvider,
        RIPEMD160_PRECOMPILE,
        testData,
        "RIPEMD160 Precompile"
    );

    // Using viem
    await callPrecompileWithViem(
        viemClient,
        RIPEMD160_PRECOMPILE,
        testData,
        "RIPEMD160 Precompile"
    );
}

/**
 * Test 3: SHA256 Precompile
 * Computes SHA256 hash of input data
 */
async function testSha256Precompile() {
    console.log("\n" + "=".repeat(60));
    console.log("Test 3: SHA256 Precompile (0x02)");
    console.log("=".repeat(60));

    const ethersProvider = getEthersProvider();

    // Test data - "hello" in hex
    const testData = "0x68656c6c6f000000000000000000000000000000000000000000000000000000";

    await callPrecompileWithEthers(
        ethersProvider,
        SHA256_PRECOMPILE,
        testData,
        "SHA256 Precompile"
    );

    // Verify the result
    const crypto = require('crypto');
    const expectedHash = crypto.createHash('sha256').update('hello').digest('hex');
    console.log(`Expected SHA256('hello'): 0x${expectedHash}`);
}

/**
 * Test 4: Simple precompile call (demonstration)
 */
async function testSimplePrecompileCall() {
    console.log("\n" + "=".repeat(60));
    console.log("Test 4: Simple Precompile Demonstration");
    console.log("=".repeat(60));

    const ethersProvider = getEthersProvider();

    // Simple identity call with some data
    const testData = "0x1234567890abcdef";

    console.log("\nCalling identity precompile with simple data...");
    const result = await ethersProvider.call({
        to: IDENTITY_PRECOMPILE,
        data: testData
    });

    console.log(`Input:  ${testData}`);
    console.log(`Output: ${result}`);
    console.log(`Match:  ${result === testData}`);
}

/**
 * Test 5: Compare precompile results
 */
async function comparePrecompileResults() {
    console.log("\n" + "=".repeat(60));
    console.log("Test 5: Compare ethers vs viem Results");
    console.log("=".repeat(60));

    const ethersProvider = getEthersProvider();
    const viemClient = getViemClient();

    const testData = "0xdeadbeef00000000000000000000000000000000000000000000000000000000";

    // ethers result
    const ethersResult = await ethersProvider.call({
        to: IDENTITY_PRECOMPILE,
        data: testData
    });

    // viem result
    const viemResult = await viemClient.call({
        to: IDENTITY_PRECOMPILE as Address,
        data: testData as Address
    });

    console.log(`ethers result: ${ethersResult}`);
    console.log(`viem result:   ${viemResult.data}`);
    console.log(`Results match: ${ethersResult === viemResult.data}`);
}

/**
 * Main test runner
 */
async function main() {
    console.log("=".repeat(60));
    console.log("Polkadot Testnet - Precompile Contract Calls");
    console.log("=".repeat(60));
    console.log("\nAvailable precompiles:");
    console.log(`  0x01 - ECRecover (signature recovery)`);
    console.log(`  0x02 - SHA256 (hashing)`);
    console.log(`  0x03 - RIPEMD160 (hashing)`);
    console.log(`  0x04 - Identity (data copy)`);

    try {
        await testIdentityPrecompile();
        await testRipemd160Precompile();
        await testSha256Precompile();
        await testSimplePrecompileCall();
        await comparePrecompileResults();

        console.log("\n" + "=".repeat(60));
        console.log("All precompile tests completed!");
        console.log("=".repeat(60));
    } catch (error) {
        console.error("Error during testing:", error);
    }
}

// Run the tests
main();
