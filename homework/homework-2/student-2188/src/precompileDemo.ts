// src/precompileDemo.ts
// =====================================================================
// ✅ 最终修复版 v4
//
// 错误溯源：
//   -32602 / -32000 "Metadata error: The generated code is not compatible
//   with the node" 的真正来源是 @polkadot-api/descriptors 中的 wah 描述符
//   版本与当前 Westend Asset Hub 节点 runtime metadata 不匹配。
//   polkadot-api 在内部做类型校验时失败，错误被透传给 viem 的 client.call()
//   显示为 -32602，直接用 fetch 时节点直接回复 -32000。
//
// 根本解法：
//   1. 执行 `npx papi update` 更新 wah 描述符（解决 -32000）
//   2. 预编译调用改用原生 fetch 完全手动构造 JSON-RPC payload，
//      绕过 viem / papi 的所有内部序列化/校验逻辑，直接控制字段。
//
// eth_call payload 字段说明（pallet_revive 实测可接受）：
//   from      必须（origin 身份）
//   to        必须（合约地址）
//   data      必须（calldata）
//   gas       可选（None 时 pallet_revive 内部用 u64::MAX，但填上更安全）
//   gasPrice  可选（None 时自动处理）
// =====================================================================

import {
  toHex,
  stringToBytes,
  encodeFunctionData,
  decodeFunctionResult,
} from "viem";
import { ETH_RPC_URL, CHAIN_ID } from "./config.js";

const SYSTEM_PRECOMPILE_ADDRESS =
  "0x0000000000000000000000000000000000000900" as const;

// Chain ID 作为 hex 字符串注入 eth_call（某些节点需要此字段做校验）
const CHAIN_ID_HEX = toHex(CHAIN_ID);

const SYSTEM_ABI = [
  {
    inputs: [{ internalType: "bytes", name: "input", type: "bytes" }],
    name: "hashBlake256",
    outputs: [{ internalType: "bytes32", name: "digest", type: "bytes32" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes", name: "input", type: "bytes" }],
    name: "hashBlake128",
    outputs: [{ internalType: "bytes32", name: "digest", type: "bytes32" }],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "input", type: "address" }],
    name: "toAccountId",
    outputs: [{ internalType: "bytes", name: "account_id", type: "bytes" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "callerIsOrigin",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "callerIsRoot",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// =====================================================================
// 原生 JSON-RPC 请求计数器
// =====================================================================
let _rpcId = 1;

// =====================================================================
// 核心：手动构造 eth_call，完全不经过 viem / papi 任何内部逻辑
// =====================================================================
async function rawEthCall(
  functionName: string,
  calldata: `0x${string}`,
  from: `0x${string}`
): Promise<`0x${string}`> {
  const body = {
    jsonrpc: "2.0",
    id:      _rpcId++,
    method:  "eth_call",
    params: [
      {
        from,
        to:       SYSTEM_PRECOMPILE_ADDRESS,
        data:     calldata,
        chainId:  CHAIN_ID_HEX,
        // gas 和 gasPrice 故意不填：
        // pallet_revive 源码确认，GenericTransaction 中 gas: None 合法，
        // 节点会使用 u64::MAX 作为上限（见 dry_run_eth_transact 日志）
        // 如果节点仍报错，可以取消下面两行注释：
        gas:      "0x1312D00",   // 20_000_000 gas
        gasPrice: "0x5F5E100",   // 100_000_000 wei = 0.1 Gwei
      },
      "latest",
    ],
  };

  const resp = await fetch(ETH_RPC_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} ${resp.statusText} (fn: ${functionName})`);
  }

  const json = await resp.json() as {
    result?: `0x${string}`;
    error?:  { code: number; message: string; data?: unknown };
  };

  if (json.error) {
    // 如果仍然报 -32000/-32602，打印完整错误体辅助诊断
    const detail = json.error.data ? ` | data: ${JSON.stringify(json.error.data)}` : "";
    // 专门识别 Substrate 的 Metadata 问题（代理/节点与 Runtime metadata 不兼容）
    if (
      json.error.code === -32000 ||
      (typeof json.error.message === "string" && /metadata/i.test(json.error.message))
    ) {
      console.error("\n❗️ 已检测到已知基础设施错误：节点/ETH RPC 代理的 Metadata 与链不匹配（Metadata error）。");
      console.error("   建议：1) 在 Polkadot 官方仓库或 Discord 报告该问题；2) 运行 `npx papi update` 更新描述符后重试；");
      console.error(`   详细 RPC 错误: code=${json.error.code} message=${json.error.message}${detail}\n`);
    }
    throw new Error(
      `RPC Error [${json.error.code}] ${json.error.message}${detail} (fn: ${functionName})`
    );
  }

  if (json.result === undefined || json.result === null) {
    throw new Error(`eth_call 返回空结果 (fn: ${functionName})`);
  }

  return json.result;
}

// =====================================================================
// 封装：encode → rawEthCall → decode
// =====================================================================
async function callPrecompile(
  functionName: string,
  args: readonly unknown[],
  from: `0x${string}`
): Promise<unknown> {
  const calldata = encodeFunctionData({
    abi:          SYSTEM_ABI,
    functionName: functionName as never,
    args:         args as never,
  });

  const raw = await rawEthCall(functionName, calldata, from);

  return decodeFunctionResult({
    abi:          SYSTEM_ABI,
    functionName: functionName as never,
    data:         raw,
  });
}

// =====================================================================
// 主演示函数
// =====================================================================
export async function demoSystemPrecompile(ethAddress: string): Promise<void> {
  console.log("\n" + "🔮".repeat(20));
  console.log("System 预编译合约演示");
  console.log("🔮".repeat(20));

  const from = ethAddress as `0x${string}`;

  console.log(`\n合约地址：${SYSTEM_PRECOMPILE_ADDRESS}`);
  console.log(`测试账户：${ethAddress}`);
  console.log(`Chain ID：${CHAIN_ID} (${CHAIN_ID_HEX})`);
  console.log(`\n💡 调用方式：原生 fetch 手动构造 JSON-RPC，完全绕过 viem/papi`);
  console.log(`   根因说明：@polkadot-api/descriptors wah 描述符版本`);
  console.log(`   与节点 metadata 不兼容，任何经过 papi 内部校验的调用均报错`);
  console.log(`   解决：npx papi update（更新描述符）+ 原生 fetch（绕过校验）`);

  const inputText = "Hello Polkadot!";
  const inputHex  = toHex(stringToBytes(inputText));

  // ════════════════════════════════════════════════════════════════
  // 演示 1：hashBlake256
  // ════════════════════════════════════════════════════════════════
  console.log("\n" + "─".repeat(50));
  console.log("📋 演示 1: hashBlake256(bytes) → bytes32");
  console.log("─".repeat(50));
  console.log("作用：计算 BLAKE2b-256 哈希（Polkadot 生态标准哈希算法）\n");
  console.log(`  输入文本: "${inputText}"`);
  console.log(`  编码为 hex: ${inputHex}`);

  try {
    const result = await callPrecompile("hashBlake256", [inputHex], from);
    console.log(`\n  ✅ BLAKE2b-256 哈希 (bytes32):`);
    console.log(`     ${result}`);
    console.log(`\n  🔍 观察：固定 32 字节，0x + 64 个十六进制字符`);
    console.log(`           BLAKE2 是 Polkadot 标准哈希，Substrate 存储 Key 广泛使用`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ hashBlake256 失败: ${msg}`);
  }

  // ════════════════════════════════════════════════════════════════
  // 演示 2：hashBlake128
  // ════════════════════════════════════════════════════════════════
  console.log("\n" + "─".repeat(50));
  console.log("📋 演示 2: hashBlake128(bytes) → bytes32");
  console.log("─".repeat(50));
  console.log("作用：计算 BLAKE2b-128 哈希（16字节有效，填充到 bytes32 返回）\n");

  try {
    const result = await callPrecompile("hashBlake128", [inputHex], from);
    const hex = result as string;
    const raw = hex.slice(2);
    console.log(`  ✅ BLAKE2b-128 哈希 (bytes32):`);
    console.log(`     ${hex}`);
    console.log(`\n  🔍 结构解析：`);
    console.log(`     有效哈希 (前16字节): 0x${raw.slice(0, 32)}`);
    console.log(`     零填充   (后16字节): 0x${raw.slice(32)}`);
    console.log(
      `     验证: ${raw.slice(32) === "0".repeat(32) ? "✅ 后半全零" : "⚠️ 非零"}`
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ hashBlake128 失败: ${msg}`);
  }

  // ════════════════════════════════════════════════════════════════
  // 演示 3：toAccountId
  // ════════════════════════════════════════════════════════════════
  console.log("\n" + "─".repeat(50));
  console.log("📋 演示 3: toAccountId(address) → bytes");
  console.log("─".repeat(50));
  console.log("作用：链上将 H160 转为 Substrate AccountId32（32字节）\n");
  console.log(`  输入地址: ${ethAddress}`);

  try {
    const result = await callPrecompile("toAccountId", [from], from);
    const hex    = result as string;
    console.log(`\n  ✅ AccountId32 (32字节):`);
    console.log(`     ${hex}`);

    const raw = hex.slice(2);
    if (raw.length === 64) {
      const h160   = raw.slice(0, 40);
      const suffix = raw.slice(40, 64);
      console.log(`\n  🔍 结构解析：`);
      console.log(`     前 20 字节 (H160):      0x${h160}`);
      console.log(`     后 12 字节 (EE 后缀):    0x${suffix}`);
      console.log(
        `     后缀验证: ${
          suffix === "ee".repeat(12)
            ? "✅ 0xEE×12，与本地算法完全吻合！"
            : "⚠️ 非标准后缀"
        }`
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ toAccountId 失败: ${msg}`);
  }

  // ════════════════════════════════════════════════════════════════
  // 演示 4：callerIsRoot
  // ════════════════════════════════════════════════════════════════
  console.log("\n" + "─".repeat(50));
  console.log("📋 演示 4: callerIsRoot() → bool");
  console.log("─".repeat(50));
  console.log("作用：检查调用者是否具有 Root 治理权限\n");

  try {
    const result = await callPrecompile("callerIsRoot", [], from);
    console.log(`  ✅ 是否有 Root 权限: ${result}`);
    console.log(
      `  ${result ? "⚠️ 意外！普通账户不应有 Root 权限" : "✅ 符合预期，普通账户无 Root 权限"}`
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ callerIsRoot 失败: ${msg}`);
  }

  // ════════════════════════════════════════════════════════════════
  // 演示 5：callerIsOrigin
  // ════════════════════════════════════════════════════════════════
  console.log("\n" + "─".repeat(50));
  console.log("📋 演示 5: callerIsOrigin() → bool");
  console.log("─".repeat(50));
  console.log("作用：检查调用者是否是整个调用栈的最初发起者\n");

  try {
    const result = await callPrecompile("callerIsOrigin", [], from);
    console.log(`  ✅ 是否是原始发起者: ${result}`);
    console.log(`\n  🔍 直接 eth_call 调用时应为 true（无中间合约层）`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ callerIsOrigin 失败: ${msg}`);
  }

  console.log("\n" + "🎉".repeat(20));
  console.log("System 预编译合约演示完成！");
  console.log("🎉".repeat(20));
}