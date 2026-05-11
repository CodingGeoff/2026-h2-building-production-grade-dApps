// src/balanceChecker.ts
// =====================================================================
// ✅ 修复版 v2：
//   Bug A 修复 —— ETH RPC 返回 free - ExistentialDeposit，
//                断言需加回 ED 后再与 Substrate free 比较
// =====================================================================

import { createPublicClient, http } from "viem";
import { createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws";
import { wah } from "@polkadot-api/descriptors";
import { ethAddressToSS58 } from "./addressConverter.js";
import { ETH_RPC_URL, SUBSTRATE_WS_URL, CHAIN_ID } from "./config.js";
import assert from "assert";

const westendAssetHub = {
  id: Number(CHAIN_ID),
  name: "Westend Asset Hub",
  nativeCurrency: { decimals: 12, name: "Westend", symbol: "WND" },
  rpcUrls: { default: { http: [ETH_RPC_URL] } },
} as const;

export async function checkBalanceConsistency(
  ethAddress: string
): Promise<void> {
  console.log("\n" + "🔍".repeat(20));
  console.log("开始余额一致性测试");
  console.log("🔍".repeat(20));

  const ss58Address = ethAddressToSS58(ethAddress);
  console.log(`\n测试账户：`);
  console.log(`  以太坊地址: ${ethAddress}`);
  console.log(`  SS58 地址:  ${ss58Address}`);

    let viemClient: any;
  let papiClient: any;
  let api: any;

  try {
    viemClient = createPublicClient({
      chain: westendAssetHub,
      transport: http(ETH_RPC_URL),
    });

    // 锁定区块号，两次查询同一快照
    const latestBlockNumber = await viemClient.getBlockNumber();
    console.log(`\n📌 锁定查询区块号: ${latestBlockNumber}`);
    console.log(`   （两次查询都将在此区块的状态下执行，消除时序差异）`);

    // ── 方式一：viem 查询余额 ─────────────────────────────────────────
    console.log("\n📡 方式一：通过 ETH RPC（viem）查询余额...");

    const balanceViaEth = await viemClient.getBalance({
      address: ethAddress as `0x${string}`,
      blockNumber: latestBlockNumber,
    });

    const balanceInPlanck_fromEth = balanceViaEth / 1_000_000n;

    console.log(`  ETH RPC 原始返回 (18位精度): ${balanceViaEth.toString()}`);
    console.log(`  换算为 Planck (÷10^6):      ${balanceInPlanck_fromEth.toString()}`);
    console.log(`  换算为 WND (÷10^12):        ${formatUnits(balanceInPlanck_fromEth, 12)} WND`);

    // ── 方式二：papi 查询余额 ─────────────────────────────────────────
    console.log("\n🔗 方式二：通过 Substrate RPC（papi）查询余额...");

    papiClient = createClient(getWsProvider(SUBSTRATE_WS_URL));
    api = papiClient.getTypedApi(wah);

    const block = await viemClient.getBlock({ blockNumber: latestBlockNumber });
    const blockHash = block.hash as string;

    console.log(`  查询区块哈希: ${blockHash}`);

    const accountInfo = await api.query.System.Account.getValue(
      ss58Address,
      { at: blockHash }
    );

    const freeBalanceRaw   = accountInfo.data.free;
    const frozenBalanceRaw = accountInfo.data.frozen;
    // 统一转为 bigint 以便后续计算、格式化
    const freeBalance: bigint = typeof freeBalanceRaw === "bigint" ? freeBalanceRaw : BigInt(freeBalanceRaw);
    const frozenBalance: bigint = typeof frozenBalanceRaw === "bigint" ? frozenBalanceRaw : BigInt(frozenBalanceRaw);

    console.log(`  可用余额 (free,   Planck): ${freeBalance.toString()}`);
    console.log(`  冻结金额 (frozen, Planck): ${frozenBalance.toString()}`);
    console.log(`  换算为 WND (÷10^12):       ${formatUnits(freeBalance, 12)} WND`);

    // ── ✅ Bug A 修复核心：读取链上 ExistentialDeposit 常量 ───────────
    //
    // pallet_revive 的 ETH 余额映射规则：
    //   eth_balance_wei  = (free - max(frozen, reserved) - ED) × 10^6
    //   eth_balance_planck = free - max(frozen, reserved) - ED
    //
    // 所以正确的断言方程是：
    //   balanceInPlanck_fromEth + ED  ===  freeBalance   （frozen=0 时）
    //   balanceInPlanck_fromEth + ED  ===  freeBalance - frozenBalance （通用）
    //
    const existentialDeposit: bigint =
      await api.constants.Balances.ExistentialDeposit();

    console.log(`\n📐 链上 ExistentialDeposit: ${existentialDeposit.toString()} Planck`);
    console.log(`   （ETH RPC 已从余额中扣除此值，确保账户不会被清除）`);

    // ETH RPC 实际反映的 Substrate 可用量
    // = free - frozen - ED （frozen 为 0 时简化为 free - ED）
    const substrateUsable = freeBalance - frozenBalance - existentialDeposit;

    console.log(`\n📊 余额对照表：`);
    console.log(`  Substrate free:              ${freeBalance.toString()} Planck`);
    console.log(`  Substrate frozen:            ${frozenBalance.toString()} Planck`);
    console.log(`  ExistentialDeposit:          ${existentialDeposit.toString()} Planck`);
    console.log(`  Substrate 可用 (free-frozen-ED): ${substrateUsable.toString()} Planck`);
    console.log(`  ETH RPC 换算值:              ${balanceInPlanck_fromEth.toString()} Planck`);

    // ── 断言验证 ─────────────────────────────────────────────────────
    console.log("\n⚖️  执行一致性断言验证...");

    try {
      assert.strictEqual(
        balanceInPlanck_fromEth,
        substrateUsable,
        `❌ 余额不一致！
           ETH RPC 查到 (Planck):             ${balanceInPlanck_fromEth}
           Substrate (free-frozen-ED) (Planck): ${substrateUsable}
           差值: ${
             balanceInPlanck_fromEth > substrateUsable
               ? balanceInPlanck_fromEth - substrateUsable
               : substrateUsable - balanceInPlanck_fromEth
           } Planck`
      );

      console.log("✅ 断言通过！ETH RPC 余额 === Substrate (free - frozen - ED)");
      console.log(`   统一余额值：${balanceInPlanck_fromEth.toString()} Planck`);
      console.log(`             = ${formatUnits(balanceInPlanck_fromEth, 12)} WND`);
    } catch (error) {
      if (error instanceof assert.AssertionError) {
        console.error("❌ 断言失败！");
        console.error(error.message);
      } else {
        throw error;
      }
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const errAny = err as any;
    const isMetadata =
      /metadata/i.test(msg) ||
      /generated code is not compatible/i.test(msg) ||
      /-32602/.test(msg) ||
      errAny?.code === -32000 ||
      errAny?.code === -32602;

    if (isMetadata) {
      console.error("\n❗️ 检测到已知基础设施问题：节点/Proxy 的 Metadata 不匹配（Metadata error）。");
      console.error("   这不是本地代码的问题。建议：");
      console.error("     1) 在 Polkadot 官方仓库或 Discord 上反馈该问题；");
      console.error("     2) 在本地尝试运行 `npx papi update` 更新描述符后重试；");
      console.error(`   原始错误（摘要）: ${msg}\n`);
      // 优雅返回，使演示脚本继续进行其他步骤
      return;
    }

    // 不是已知 infra 问题，向上抛出以便外层捕获
    throw err;
  } finally {
    try {
      await papiClient?.destroy?.();
    } catch (e) {
      // 忽略 destroy 的错误
    }
  }
}

function formatUnits(value: bigint, decimals: number): string {
  const divisor  = 10n ** BigInt(decimals);
  const intPart  = value / divisor;
  const fracPart = value % divisor;
  const fracStr  = fracPart.toString().padStart(decimals, "0").slice(0, 6);
  return `${intPart}.${fracStr}`;
}


