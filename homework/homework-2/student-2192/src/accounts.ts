import { DEV_PHRASE, entropyToMiniSecret, KeyPair, ss58Address, mnemonicToEntropy } from "@polkadot-labs/hdkd-helpers";
import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import { keccak256, getBytes, getAddress } from "ethers";
import { randomBytes } from 'crypto';
import { ethers } from "ethers";
import { encodeAddress, decodeAddress } from "@polkadot/util-crypto";
import { hexToU8a, u8aToHex } from "@polkadot/util";

const SS58_PREFIX = 42; // Polkadot generic network

/**
 * Get a keypair from a derivation path
 */
export function getKeypairFromPath(path: string): KeyPair {
    const entropy = mnemonicToEntropy(DEV_PHRASE);
    const miniSecret = entropyToMiniSecret(entropy);
    const derive = sr25519CreateDerive(miniSecret);
    const hdkdKeyPair = derive(path);
    return hdkdKeyPair;
}

export const getAlice = () => getKeypairFromPath("//Alice");
export const getBob = () => getKeypairFromPath("//Bob");

/**
 * Generate a random Substrate keypair
 */
export function getRandomSubstrateKeypair(): KeyPair {
    const seed = randomBytes(32);
    const miniSecret = entropyToMiniSecret(seed);
    const derive = sr25519CreateDerive(miniSecret);
    const hdkdKeyPair = derive("");
    return hdkdKeyPair;
}

/**
 * Convert a public key to SS58 address
 */
export function convertPublicKeyToSs58(publicKey: Uint8Array, prefix: number = SS58_PREFIX): string {
    return ss58Address(publicKey, prefix);
}

export type AccountId32 = Uint8Array;

/**
 * Check if an AccountId32 is Ethereum-derived (has 0xEE suffix)
 */
function isEthDerived(accountId: AccountId32): boolean {
    if (accountId.length !== 32) {
        return false;
    }
    for (let i = 20; i < 32; i++) {
        if (accountId[i] !== 0xEE) {
            return false;
        }
    }
    return true;
}

/**
 * Convert an EVM H160 address to Substrate AccountId32
 * Uses the EVM prefix pattern (0xEE...EE)
 */
export function h160ToAccountId32(address: string): AccountId32 {
    const normalizedAddress = getAddress(address);
    const addressBytes = getBytes(normalizedAddress);

    if (addressBytes.length !== 20) {
        throw new Error(`H160 address must be 20 bytes, got ${addressBytes.length}`);
    }

    const accountId = new Uint8Array(32);
    accountId.fill(0xEE);
    accountId.set(addressBytes, 0);

    return accountId;
}

/**
 * Convert a Substrate AccountId32 to EVM H160 address
 * If eth-derived, extract the first 20 bytes
 * Otherwise, use Keccak256 hash
 */
export function accountId32ToH160(accountId: AccountId32): string {
    if (accountId.length !== 32) {
        throw new Error(`AccountId32 must be 32 bytes, got ${accountId.length}`);
    }

    if (isEthDerived(accountId)) {
        // Ethereum-derived: extract first 20 bytes
        const h160Bytes = accountId.slice(0, 20);
        const addressHex = '0x' + Buffer.from(h160Bytes).toString('hex');
        return getAddress(addressHex);
    } else {
        // Non-eth-derived: hash and take last 20 bytes
        const hash = keccak256(accountId);
        const hashBytes = getBytes(hash);
        const h160Bytes = hashBytes.slice(12, 32);
        const addressHex = '0x' + Buffer.from(h160Bytes).toString('hex');
        return getAddress(addressHex);
    }
}

/**
 * SS58 address to AccountId32 (raw public key)
 */
export function ss58ToAccountId32(ss58Address: string): Uint8Array {
    return decodeAddress(ss58Address);
}

/**
 * AccountId32 (public key) to SS58 address
 */
export function accountId32ToSs58(accountId: Uint8Array, prefix: number = SS58_PREFIX): string {
    return encodeAddress(accountId, prefix);
}

/**
 * Generate a random Ethers wallet
 */
export function generateRandomEthersWallet(): string {
    const account = ethers.Wallet.createRandom();
    console.log("New account private key:", account.privateKey);
    return account.address;
}

/**
 * Convert SS58 address to EVM address using keccak256
 */
export function ss58ToEvmAddress(ss58Address: string): string {
    const publicKey = decodeAddress(ss58Address);
    const hash = keccak256(publicKey);
    const hashBytes = getBytes(hash);
    const h160Bytes = hashBytes.slice(12, 32);
    const addressHex = '0x' + Buffer.from(h160Bytes).toString('hex');
    return getAddress(addressHex);
}

/**
 * Convert EVM address to SS58 address (for demonstration)
 * Note: This creates a new keypair, not the original one
 */
export function evmToSs58Address(evmAddress: string, prefix: number = SS58_PREFIX): string {
    const publicKey = getBytes(evmAddress);
    // Pad to 32 bytes if needed
    const fullPublicKey = new Uint8Array(32);
    fullPublicKey.set(publicKey, 0);
    return encodeAddress(fullPublicKey, prefix);
}
