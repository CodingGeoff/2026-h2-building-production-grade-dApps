// src/index.ts
import {
  printAddressConversion,
  ethAddressToSS58,
  ss58ToEthAddress,         // ← 新增导入
} from "./addressConverter.js";
import { checkBalanceConsistency } from "./balanceChecker.js";
import { demoSystemPrecompile } from "./precompileDemo.js";
import { TEST_ETH_ADDRESS } from "./config.js";

async function main() {
  console.log("\n" + "🌟".repeat(30));
  console.log("  Polkadot Testnet 交互演示程序  ");
  console.log("  目标网络：Westend Asset Hub Testnet  ");
  console.log("🌟".repeat(30) + "\n");

  // ── 任务 1：地址转换演示 ──────────────────────────────────────────
  console.log("📌 任务 1：地址双向转换");
  printAddressConversion(TEST_ETH_ADDRESS);

  // 验证双向转换
  const ss58 = ethAddressToSS58(TEST_ETH_ADDRESS);
  const recovered = ss58ToEthAddress(ss58);
  console.log(`双向验证:`);
  console.log(`  以太坊地址 → SS58:  ${TEST_ETH_ADDRESS} → ${ss58}`);
  console.log(`  SS58 → 以太坊地址:  ${ss58} → ${recovered}`);
  console.log(
    `  还原是否一致: ${recovered?.toLowerCase() === TEST_ETH_ADDRESS.toLowerCase() ? "✅ 一致" : "❌ 不一致"}`
  );

  // ── 任务 2：余额一致性测试 ────────────────────────────────────────
  console.log("\n📌 任务 2：余额一致性测试");
  await checkBalanceConsistency(TEST_ETH_ADDRESS);

  // ── 任务 3：System 预编译合约调用 ────────────────────────────────
  console.log("\n📌 任务 3：System 预编译合约调用");
  await demoSystemPrecompile(TEST_ETH_ADDRESS);

  console.log("\n✅ 所有任务执行完毕！");
}

main().catch((error) => {
  console.error("❌ 程序出错：", error);
  process.exit(1);
});