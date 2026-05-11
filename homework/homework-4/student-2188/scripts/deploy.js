// scripts/deploy.js
// ============================================================
// StudentRegistry 合约部署脚本
// 使用方式: npx hardhat run scripts/deploy.js --network moonbaseAlpha
// ============================================================

const hre = require("hardhat");

async function main() {
  console.log("\n========================================");
  console.log("  🚀 开始部署 StudentRegistry 合约");
  console.log("========================================\n");

  // ──────────────────────────────────────
  // 1. 获取部署账户信息
  // ──────────────────────────────────────
  const [deployer] = await hre.ethers.getSigners();

  console.log("📋 部署账户地址:", deployer.address);

  // 查询部署前的账户余额
  const balanceBefore = await hre.ethers.provider.getBalance(deployer.address);
  console.log(
    "💰 部署前账户余额:",
    hre.ethers.formatEther(balanceBefore),
    "DEV\n"
  );

  // ──────────────────────────────────────
  // 2. 获取合约工厂（ContractFactory）
  //    ContractFactory 是用来部署合约的工具对象
  // ──────────────────────────────────────
  console.log("🔨 正在获取合约工厂...");
  const StudentRegistry = await hre.ethers.getContractFactory("StudentRegistry");

  // ──────────────────────────────────────
  // 3. 发送部署交易（deploy 函数会发送一笔特殊交易到链上）
  // ──────────────────────────────────────
  console.log("📡 正在发送部署交易到 Moonbase Alpha...");
  const studentRegistry = await StudentRegistry.deploy();

  // waitForDeployment() 会等待交易被打包进区块（确认）
  console.log("⏳ 等待交易确认...");
  await studentRegistry.waitForDeployment();

  // ──────────────────────────────────────
  // 4. 获取并打印合约地址
  //    .target 是 ethers v6 中合约地址的属性名
  // ──────────────────────────────────────
  const contractAddress = await studentRegistry.getAddress();

  console.log("\n========================================");
  console.log("  ✅ 合约部署成功！");
  console.log("========================================");
  console.log("📍 合约地址:", contractAddress);
  console.log(
    "🔍 区块浏览器:",
    `https://moonbase.moonscan.io/address/${contractAddress}`
  );
  console.log("========================================\n");

  // ──────────────────────────────────────
  // 5. 查询部署后的账户余额（对比消耗了多少 gas fee）
  // ──────────────────────────────────────
  const balanceAfter = await hre.ethers.provider.getBalance(deployer.address);
  console.log(
    "💸 部署后账户余额:",
    hre.ethers.formatEther(balanceAfter),
    "DEV"
  );
  console.log(
    "⛽ 部署消耗 Gas 费用:",
    hre.ethers.formatEther(balanceBefore - balanceAfter),
    "DEV\n"
  );

  // ──────────────────────────────────────
  // ⚠️ 重要：将合约地址保存下来，后续 main.js 需要用到！
  // ──────────────────────────────────────
  console.log("⚠️  请将合约地址复制到 scripts/main.js 的 CONTRACT_ADDRESS 变量中！");
}

// 标准错误处理模式
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署失败:", error);
    process.exit(1);
  });