// scripts/main.js
// ============================================================
// 综合交互脚本
// 一次性完成：查询余额 → 写入交易 → 等待确认 → 读取状态
// 使用方式: npx hardhat run scripts/main.js --network moonbaseAlpha
// ============================================================

const hre = require("hardhat");

// ██████████████████████████████████████████████████████████
// ⚙️  配置区 - 将下面的地址替换为你的实际合约地址！
// ██████████████████████████████████████████████████████████
const CONTRACT_ADDRESS = "0x014dE888114857A9D2e8cB00B1e8b2F8075d1BD3"; // 在这里粘贴你的合约地址，例如: "0xAbCd1234..."

// 学生注册信息（可以自定义）
const STUDENT_INFO = {
  name:  "Satoshi Nakamoto",
  age:   35,
  grade: 99,
};
// ██████████████████████████████████████████████████████████

// ──────────────────────────────────────────────────────────
// 工具函数：打印分隔线
// ──────────────────────────────────────────────────────────
function printSection(title) {
  console.log("\n" + "═".repeat(50));
  console.log(`  ${title}`);
  console.log("═".repeat(50));
}

async function main() {
  console.log("\n" + "█".repeat(50));
  console.log("  🌐 Polkadot EVM 综合交互脚本启动");
  console.log("  📡 目标网络: Moonbase Alpha (Chain ID: 1287)");
  console.log("█".repeat(50));

  // ════════════════════════════════════════════════
  // STEP 1: 初始化 - 获取 Signer 和 Provider
  // Signer = 有私钥的账户，可以签名并发送交易
  // Provider = 连接到区块链网络的只读接口
  // ════════════════════════════════════════════════
  printSection("STEP 1: 初始化账户与网络连接");

  const [signer] = await hre.ethers.getSigners();
  const provider = hre.ethers.provider;

  console.log("✅ 账户地址:", signer.address);

  // 获取当前网络信息
  const network = await provider.getNetwork();
  console.log("✅ 已连接网络:", network.name);
  console.log("✅ Chain ID   :", network.chainId.toString());

  // ════════════════════════════════════════════════
  // STEP 2: 【查询】获取账户本地代币余额
  // ════════════════════════════════════════════════
  printSection("STEP 2: 💰 查询账户 DEV 代币余额");

  // provider.getBalance() 返回的是 BigInt 类型的 Wei 值
  // 1 DEV = 1,000,000,000,000,000,000 Wei (10^18)
  const balanceWei = await provider.getBalance(signer.address);

  // formatEther() 将 Wei 转换为可读的 DEV（保留18位小数）
  const balanceDEV = hre.ethers.formatEther(balanceWei);

  console.log("💰 账户余额 (Wei):", balanceWei.toString());
  console.log("💰 账户余额 (DEV):", balanceDEV, "DEV");

  // 余额安全检查
  if (parseFloat(balanceDEV) < 0.001) {
    throw new Error("❌ 余额不足！请先去水龙头领取 DEV 代币：https://apps.moonbeam.network/moonbase-alpha/faucet/");
  }
  console.log("✅ 余额充足，可以发送交易！");

  // ════════════════════════════════════════════════
  // STEP 3: 连接到已部署的合约
  // ════════════════════════════════════════════════
  printSection("STEP 3: 🔌 连接到 StudentRegistry 合约");

  // 从编译产物（artifacts）中获取合约的 ABI
  // ABI = Application Binary Interface，描述了合约的所有函数
  const StudentRegistry = await hre.ethers.getContractFactory("StudentRegistry");
  const abi = StudentRegistry.interface;

  // getContractAt：用地址和 ABI 创建一个合约实例（不部署新合约）
  // 第一个参数可以是合约名（字符串）或 ABI，第二个是合约地址
  const contract = await hre.ethers.getContractAt(
    "StudentRegistry",
    CONTRACT_ADDRESS,
    signer  // 连接到 signer，这样就能发送交易
  );

  console.log("✅ 已连接合约地址:", CONTRACT_ADDRESS);
  console.log("🔍 合约浏览器:", `https://moonbase.moonscan.io/address/${CONTRACT_ADDRESS}`);

  // ════════════════════════════════════════════════
  // STEP 3.5: 检查是否已经注册过（防止重复注册报错）
  // ════════════════════════════════════════════════
  printSection("STEP 3.5: 🔍 检查注册状态");

  const alreadyRegistered = await contract.isRegistered(signer.address);
  console.log("📋 当前注册状态:", alreadyRegistered ? "已注册" : "未注册");
  console.log("📊 已注册学生总数:", (await contract.totalStudents()).toString());

  if (alreadyRegistered) {
    console.log("⚠️  该地址已注册，跳过注册步骤，直接读取数据...");
  }

  // ════════════════════════════════════════════════
  // STEP 4: 【写入】调用 register 函数发送交易
  // ════════════════════════════════════════════════
  if (!alreadyRegistered) {
    printSection("STEP 4: ✍️  发送 register 交易（写入区块链）");

    console.log("📝 准备注册学生信息:");
    console.log("   姓名:", STUDENT_INFO.name);
    console.log("   年龄:", STUDENT_INFO.age);
    console.log("   成绩:", STUDENT_INFO.grade);
    console.log("");

    // 调用合约的 register 函数
    // 这会构建一笔交易，用 signer 签名，然后广播到网络
    console.log("📡 正在构建并广播交易...");
    const tx = await contract.register(
      STUDENT_INFO.name,
      STUDENT_INFO.age,
      STUDENT_INFO.grade,
      {
        // 可以手动指定 gas limit，也可以让 ethers 自动估算
        // gasLimit: 200000,
      }
    );

    // ════════════════════════════════════════════════
    // STEP 5: 【等待】等待交易收据（Receipt）
    // ════════════════════════════════════════════════
    printSection("STEP 5: ⏳ 等待交易确认（Transaction Receipt）");

    console.log("🔗 交易哈希 (TxHash):", tx.hash);
    console.log(
      "🔍 交易浏览器:",
      `https://moonbase.moonscan.io/tx/${tx.hash}`
    );
    console.log("⏳ 等待区块链确认（约 6 秒出一个块）...");

    // wait(1) 表示等待 1 个区块确认
    // 返回的 receipt 包含交易执行结果的详细信息
    const receipt = await tx.wait(1);

    // ──────────────────────────────────────
    // 解析并打印 Transaction Receipt
    // ──────────────────────────────────────
    console.log("\n📄 ═══ 交易收据详情 ═══");
    console.log("  🔗 交易哈希  :", receipt.hash);
    console.log("  📦 区块号    :", receipt.blockNumber.toString());
    console.log("  🔢 交易序号  :", receipt.index.toString());
    console.log("  ⛽ 实际消耗 Gas :", receipt.gasUsed.toString());

    // gasPrice 在 EIP-1559 之后变为 effectiveGasPrice
    const gasFee = receipt.gasUsed * receipt.gasPrice;
    console.log(
      "  💸 交易手续费:",
      hre.ethers.formatEther(gasFee),
      "DEV"
    );

    // status: 1 = 成功, 0 = 失败（回滚）
    if (receipt.status === 1) {
      console.log("  ✅ 交易状态  : 成功 (status = 1)");
    } else {
      throw new Error("❌ 交易状态: 失败 (status = 0)，交易已回滚！");
    }

    // ──────────────────────────────────────
    // 解析交易日志中的事件（Event Logs）
    // ──────────────────────────────────────
    console.log("\n📋 ═══ 交易事件日志（Event Logs）═══");
    if (receipt.logs && receipt.logs.length > 0) {
      for (const log of receipt.logs) {
        try {
          // 用合约的 ABI 解析原始日志
          const parsedLog = contract.interface.parseLog({
            topics: log.topics,
            data: log.data,
          });
          if (parsedLog) {
            console.log("  📢 事件名称:", parsedLog.name);
            console.log("  📍 学生地址:", parsedLog.args.studentAddress);
            console.log("  👤 学生姓名:", parsedLog.args.name);
            console.log("  🎂 学生年龄:", parsedLog.args.age.toString());
            console.log("  📊 学生成绩:", parsedLog.args.grade.toString());
            const ts = new Date(Number(parsedLog.args.timestamp) * 1000);
            console.log("  🕐 注册时间:", ts.toLocaleString());
          }
        } catch (e) {
          // 某些 log 可能不属于这个合约，解析失败可跳过
        }
      }
    }
  }

  // ════════════════════════════════════════════════
  // STEP 6: 【读取】查询合约最新状态
  // view 函数调用不消耗 gas，是本地 RPC 调用
  // ════════════════════════════════════════════════
  printSection("STEP 6: 📖 读取合约最新状态（View 调用）");

  // 调用 getStudent() 读取学生信息
  // 返回值是一个 Student struct（在 JS 中表现为数组/对象）
  const studentData = await contract.getStudent(signer.address);

  console.log("✅ 成功从链上读取学生信息！");
  console.log("\n📋 ═══ 链上学生数据 ═══");
  console.log("  👤 姓名:", studentData.name);
  console.log("  🎂 年龄:", studentData.age.toString());
  console.log("  📊 成绩:", studentData.grade.toString());
  console.log("  ✅ 已注册:", studentData.isRegistered);
  const registerTime = new Date(Number(studentData.timestamp) * 1000);
  console.log("  🕐 注册时间:", registerTime.toLocaleString());

  // 查询总学生数
  const total = await contract.totalStudents();
  console.log("  👥 合约中学生总数:", total.toString());

  // ════════════════════════════════════════════════
  // STEP 7: 对比余额变化
  // ════════════════════════════════════════════════
  printSection("STEP 7: 💰 账户余额变化统计");

  const balanceAfterWei = await provider.getBalance(signer.address);
  const balanceAfterDEV = hre.ethers.formatEther(balanceAfterWei);

  console.log("  💰 操作前余额:", balanceDEV, "DEV");
  console.log("  💰 操作后余额:", balanceAfterDEV, "DEV");

  const consumed = parseFloat(balanceDEV) - parseFloat(balanceAfterDEV);
  console.log("  ⛽ 共消耗 Gas :", consumed.toFixed(8), "DEV");

  console.log("\n" + "█".repeat(50));
  console.log("  🎉 全部流程执行完毕！");
  console.log("  🔍 在区块浏览器查看合约:");
  console.log(`  https://moonbase.moonscan.io/address/${CONTRACT_ADDRESS}`);
  console.log("█".repeat(50) + "\n");
}

// 标准错误处理模式
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 脚本执行失败:");
    console.error(error.message || error);
    process.exit(1);
  });