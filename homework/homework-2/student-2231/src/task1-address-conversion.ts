/**
 * Homework 2 · Task 1: 地址转换 + balance 一致性验证
 *
 * 目标：
 *   1. 把 20 字节以太坊地址转换成 32 字节 Substrate AccountId (AccountId32)
 *   2. 再把 AccountId32 编码成 SS58 形式 (Polkadot AssetHub 使用的人类可读地址)
 *   3. 分别用 viem (EVM RPC) 和 @polkadot/api (Substrate RPC) 查询同一个账户的余额
 *   4. 比对两个余额应相等——因为 Polkadot Hub 的两种 API 访问的是 *同一条链的同一个账户*
 *
 * 核心原理 (官方 Accounts 文档):
 *   Polkadot Hub 用 "尾部填充 0xEE" 的方式把 H160 映射到 AccountId32:
 *     AccountId32 = keccak256? No — 直接 concat:
 *        ethAddress20 ++ bytes12(0xEE repeated 12 times)
 *   这是 **可逆** 的: Substrate -> Ethereum 方向就是把结尾连续的 0xEE 去掉。
 *
 *   参考文档:
 *     https://docs.polkadot.com/smart-contracts/for-eth-devs/accounts/
 */

import { createPublicClient, http, formatEther, type Address } from "viem";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { encodeAddress, decodeAddress } from "@polkadot/util-crypto";
import { hexToU8a, u8aToHex } from "@polkadot/util";

// ---------- 配置 ----------
// 使用 Polkadot Hub TestNet (Paseo Asset Hub)
const EVM_RPC = "https://services.polkadothub-rpc.com/testnet";
// Substrate WebSocket RPC for Paseo Asset Hub (tries several in order)
const SUBSTRATE_WS_CANDIDATES = [
  "wss://paseo-asset-hub-rpc.polkadot.io",
  "wss://sys.ibp.network/asset-hub-paseo",
  "wss://rpc-asset-hub-paseo.luckyfriday.io",
];
// SS58 prefix: Paseo Asset Hub 跟着 Polkadot 主干使用 0; 某些测试网用 42. 演示两种结果.
const SS58_PREFIXES = [0, 42];

// 待测试的 EVM 地址——也可以用任何其他地址, 这里用 Hardhat 第 0 号账户作为 demo
// (真实查询 balance 时如果账户不存在, 两边都会返回 0, 仍然 "一致")
const DEMO_ETH_ADDRESS: Address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

// ---------- 纯函数: 地址转换 ----------

/**
 * 把以太坊 H160 地址 (20 字节) 转成 Substrate AccountId32 (32 字节).
 * 规则: 尾部填充 12 个 0xEE.
 */
export function ethToAccountId32Hex(ethAddress: string): `0x${string}` {
  if (!/^0x[0-9a-fA-F]{40}$/.test(ethAddress)) {
    throw new Error(`Invalid H160 address: ${ethAddress}`);
  }
  const h160 = ethAddress.toLowerCase().slice(2); // 去掉 0x
  const suffix = "ee".repeat(12); // 24 个十六进制字符 = 12 字节
  return (`0x${h160}${suffix}`) as `0x${string}`;
}

/**
 * 从 AccountId32 (32 字节) 反推 H160.
 * 规则: 如果结尾是连续 12 个 0xEE, 就剥掉; 否则是原生 Substrate 账户, 无法反向映射.
 */
export function accountId32HexToEth(accountHex: string): `0x${string}` | null {
  if (!/^0x[0-9a-fA-F]{64}$/.test(accountHex)) {
    throw new Error(`Invalid AccountId32: ${accountHex}`);
  }
  const hex = accountHex.toLowerCase().slice(2);
  const suffix = hex.slice(40); // 后 24 个 hex char = 12 字节
  if (suffix !== "ee".repeat(12)) return null;
  return (`0x${hex.slice(0, 40)}`) as `0x${string}`;
}

/** 把 AccountId32 编码为 SS58 字符串 (依指定的 prefix). */
export function accountId32HexToSs58(accountHex: string, prefix: number): string {
  return encodeAddress(hexToU8a(accountHex), prefix);
}

// ---------- 主流程 ----------

async function main() {
  const banner = "=".repeat(70);
  console.log(banner);
  console.log("Homework 2 · Task 1: Address conversion + balance parity check");
  console.log(banner);

  // ------ Step 1: 纯粹的地址转换 (不需联网) ------
  console.log("\n[Step 1] H160 -> AccountId32 -> SS58");
  console.log(`  Input H160:         ${DEMO_ETH_ADDRESS}`);

  const accountId32 = ethToAccountId32Hex(DEMO_ETH_ADDRESS);
  console.log(`  AccountId32 (hex):  ${accountId32}`);
  console.log(`  AccountId32 length: ${(accountId32.length - 2) / 2} bytes (must be 32)`);

  for (const prefix of SS58_PREFIXES) {
    const ss58 = accountId32HexToSs58(accountId32, prefix);
    console.log(`  SS58 (prefix=${prefix}):     ${ss58}`);
  }

  // ------ Step 2: 反向验证可逆性 ------
  console.log("\n[Step 2] AccountId32 -> H160 (reverse conversion)");
  const reconstructed = accountId32HexToEth(accountId32);
  console.log(`  Recovered H160:     ${reconstructed}`);
  const match = reconstructed?.toLowerCase() === DEMO_ETH_ADDRESS.toLowerCase();
  console.log(`  Matches original?   ${match ? "YES ✓" : "NO ✗"}`);
  if (!match) throw new Error("Reverse conversion mismatch!");

  // ------ Step 3: 用 SS58 -> AccountId32 检验 polkadot util 与我们手写结果一致 ------
  console.log("\n[Step 3] Cross-check with @polkadot/util-crypto");
  const ss58 = accountId32HexToSs58(accountId32, 42);
  const decodedBytes = decodeAddress(ss58);
  const decodedHex = u8aToHex(decodedBytes);
  console.log(`  SS58 decoded back:  ${decodedHex}`);
  if (decodedHex !== accountId32) {
    throw new Error("polkadot util decodes a different AccountId than our concat logic!");
  }
  console.log("  ✓ Library and hand-rolled conversion produce identical AccountId32.");

  // ------ Step 4: 分别用 viem 和 @polkadot/api 查询余额 ------
  console.log("\n[Step 4] Query balance via EVM RPC (viem) and Substrate RPC (@polkadot/api)");
  console.log(`  EVM RPC:            ${EVM_RPC}`);
  console.log(`  Substrate WS:       <will try ${SUBSTRATE_WS_CANDIDATES.length} endpoints>`);

  // 4.1 viem — 查 EVM 侧 balance
  const evmClient = createPublicClient({ transport: http(EVM_RPC) });
  const evmChainId = await evmClient.getChainId().catch((e) => `<error: ${e?.message ?? e}>`);
  const evmBalanceWei = await evmClient
    .getBalance({ address: DEMO_ETH_ADDRESS })
    .catch((e) => {
      console.log(`  EVM getBalance error: ${e?.message ?? e}`);
      return 0n;
    });
  console.log(`  EVM chainId:        ${evmChainId}`);
  console.log(`  EVM balance (wei):  ${evmBalanceWei}`);
  console.log(`  EVM balance (DOT):  ${formatEther(evmBalanceWei)}`);

  // 4.2 @polkadot/api — 查 Substrate 侧 balance (尝试多个 RPC 端点直到成功)
  let subBalancePlanck = 0n;
  let subChain = "";
  let subRpcUsed = "";
  for (const ws of SUBSTRATE_WS_CANDIDATES) {
    try {
      const provider = new WsProvider(ws, false);
      const api = await ApiPromise.create({ provider, throwOnConnect: true });
      subChain = (await api.rpc.system.chain()).toString();
      const accountInfo = (await api.query.system.account(accountId32)) as any;
      const free = accountInfo.data?.free?.toBigInt?.() ?? 0n;
      subBalancePlanck = free;
      subRpcUsed = ws;
      await api.disconnect();
      break;
    } catch (e: any) {
      console.log(`  [${ws}] failed: ${e?.message ?? e}`);
    }
  }
  console.log(`  Substrate RPC used: ${subRpcUsed || "<none succeeded>"}`);
  console.log(`  Substrate chain:    ${subChain || "<unavailable>"}`);
  console.log(`  Substrate balance (planck): ${subBalancePlanck}`);
  console.log(`  Substrate balance (DOT):    ${formatEther(subBalancePlanck)}`);

  // ------ Step 5: 比对 ------
  console.log("\n[Step 5] Balance consistency check");
  if (evmBalanceWei === subBalancePlanck) {
    console.log(`  ✓ Both sides report the same balance: ${formatEther(evmBalanceWei)} DOT`);
    console.log("  This proves viem and @polkadot/api are reading the same chain state");
    console.log("  via two different RPC flavours (Ethereum JSON-RPC vs Substrate RPC).");
  } else {
    console.log("  ✗ Balances differ:");
    console.log(`    EVM:       ${evmBalanceWei}`);
    console.log(`    Substrate: ${subBalancePlanck}`);
    console.log("  Possible causes:");
    console.log("    - RPC endpoints point to different chains / different height");
    console.log("    - Account has never been initialised (both should then be 0)");
    console.log("    - Decimals mismatch between the two APIs");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
