import { getAddress, getBytes, keccak256 } from "ethers";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";

const SS58_PREFIX = 42;

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