// src/addressConverter.ts
// =====================================================================
// ✅ 修复版：0xEE 魔法字节在末尾（suffix），不是前缀！
//
// 官方规范（pallet_revive AccountId32Mapper）：
//   H160(20字节) + 0xEE×12(12字节) = AccountId32(32字节)
//   ↑ 以太坊地址在前，EE 填充在后
// =====================================================================

import { encodeAddress, decodeAddress } from "@polkadot/util-crypto";
import { u8aToHex, hexToU8a } from "@polkadot/util";

const SS58_PREFIX = 42;

/**
 * ✅ 正确版：H160 → AccountId32 → SS58
 *
 * 规则：AccountId32 = H160地址(20字节) + 0xEE×12(12字节)
 *       ↑ EE 在末尾，不是前缀！
 */
export function ethAddressToSS58(
  ethAddress: string,
  ss58Prefix: number = SS58_PREFIX
): string {
  if (!ethAddress.startsWith("0x") || ethAddress.length !== 42) {
    throw new Error(`无效的以太坊地址: ${ethAddress}`);
  }

  const cleanHex = ethAddress.slice(2).toLowerCase(); // 40字符 = 20字节

  // ✅ 正确：H160(20字节) 在前，0xEE×12(12字节) 在后
  const suffixHex = "ee".repeat(12);                  // 24字符 = 12字节
  const accountId32Hex = cleanHex + suffixHex;        // 64字符 = 32字节

  const accountId32Bytes = hexToU8a("0x" + accountId32Hex);
  return encodeAddress(accountId32Bytes, ss58Prefix);
}

/**
 * SS58 → 尝试还原 H160 以太坊地址
 * 检查末尾12字节是否全为 0xEE
 */
export function ss58ToEthAddress(ss58Address: string): string | null {
  const accountId32Bytes = decodeAddress(ss58Address);

  // ✅ 正确：检查末尾12字节（不是前12字节）
  const magicSuffix = accountId32Bytes.slice(20, 32);
  const isMappedAddress = magicSuffix.every((byte) => byte === 0xee);

  if (!isMappedAddress) {
    console.log("⚠️  该 SS58 地址是纯原生 Substrate 账户，无对应以太坊地址");
    return null;
  }

  // 取前20字节 = 原始 H160
  const ethAddressBytes = accountId32Bytes.slice(0, 20);
  return u8aToHex(ethAddressBytes);
}

/**
 * 打印转换详情（已修正）
 */
export function printAddressConversion(ethAddress: string): void {
  console.log("\n" + "=".repeat(60));
  console.log("📍 地址转换详情");
  console.log("=".repeat(60));

  const ss58 = ethAddressToSS58(ethAddress);
  const cleanHex = ethAddress.slice(2).toLowerCase();

  // ✅ 正确顺序：H160 在前，EE 在后
  const accountId32 = "0x" + cleanHex + "ee".repeat(12);

  console.log(`以太坊地址 (H160，20字节)：`);
  console.log(`  ${ethAddress}`);
  console.log(`\nAccountId32 (32字节，内部表示)：`);
  console.log(`  ${accountId32}`);
  console.log(`  └─ 前20字节: 0x${cleanHex}  (原始 H160 地址)`);
  console.log(`  └─ 后12字节: ${"0x" + "ee".repeat(12)} (0xEE 魔法后缀)`);
  console.log(`\nSS58 地址 (人类可读，前缀=42)：`);
  console.log(`  ${ss58}`);
  console.log("=".repeat(60) + "\n");
}