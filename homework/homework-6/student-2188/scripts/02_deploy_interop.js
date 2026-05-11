// scripts/02_deploy_interop.js
// ================================================================
// EVM ↔ PVM 互操作合约部署脚本
//
// 注意：StakingQuerier 只能在 Moonbeam/Moonbase Alpha 上运行
//       因为它需要 Parachain Staking Precompile
//       EVMCaller 可以在任何 EVM 兼容网络上运行
// ================================================================

const { ethers, network } = require("hardhat");

async function main() {
    console.log("=".repeat(60));
    console.log("🌉 EVM ↔ PVM 互操作合约部署");
    console.log(`   网络: ${network.name}`);
    console.log("=".repeat(60));

    const [deployer] = await ethers.getSigners();
    console.log(`\n部署者: ${deployer.address}`);

    // ============================================================
    // 1. 部署 EVMCaller（任何网络都可以）
    // ============================================================
    console.log("\n📦 部署 EVMCaller...");
    const EVMCaller = await ethers.getContractFactory("EVMCaller");
    const evmCaller = await EVMCaller.deploy();
    await evmCaller.waitForDeployment();
    console.log(`   ✅ EVMCaller 部署成功: ${await evmCaller.getAddress()}`);

    // ============================================================
    // 2. 部署 StakingQuerier（需要 Moonbeam 预编译）
    // ============================================================
    if (network.name === "moonbaseAlpha" || network.name === "hardhat") {
        console.log("\n📦 部署 StakingQuerier...");
        const StakingQuerier = await ethers.getContractFactory("StakingQuerier");
        const stakingQuerier = await StakingQuerier.deploy();
        await stakingQuerier.waitForDeployment();
        const querierAddress = await stakingQuerier.getAddress();
        console.log(`   ✅ StakingQuerier 部署成功: ${querierAddress}`);

        // ============================================================
        // 3. 如果在 Moonbase Alpha 上，测试预编译调用
        // ============================================================
        if (network.name === "moonbaseAlpha") {
            console.log("\n🧪 测试预编译调用...");

            try {
                // 验证预编译是否可用
                const isWorking = await stakingQuerier.verifyPrecompileWorks();
                console.log(`   预编译可用性: ${isWorking ? "✅ 正常" : "❌ 不可用"}`);

                if (isWorking) {
                    // 查询部署者地址的质押状态
                    console.log(`\n   查询地址 ${deployer.address} 的质押状态...`);

                    const isDelegator = await stakingQuerier.checkIsDelegator(deployer.address);
                    const isCandidate = await stakingQuerier.checkIsCandidate(deployer.address);
                    const totalStaked = await stakingQuerier.getDelegatorStake(deployer.address);

                    console.log(`   isDelegator:  ${isDelegator}`);
                    console.log(`   isCandidate:  ${isCandidate}`);
                    console.log(`   totalStaked:  ${ethers.formatEther(totalStaked)} GLMR`);

                    console.log("\n   ✅ EVM → PVM 预编译调用成功！");
                    console.log("   这证明我们的 Solidity 代码成功调用了 Substrate Rust 模块！");
                }
            } catch (error) {
                console.log(`   ⚠️  预编译调用失败: ${error.message}`);
                console.log("   确认你连接到了 Moonbase Alpha 网络");
            }
        }
    }

    // ============================================================
    // 4. 演示 PVM → EVM 的调用流程（文字说明）
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("📖 PVM → EVM 调用流程说明：");
    console.log("=".repeat(60));
    console.log(`
方法1: 使用 pallet-evm::call extrinsic（推荐）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
① 打开 Polkadot-JS Apps: https://polkadot.js.org/apps
② 连接到你的 Substrate 节点
③ 导航到: Developer → Extrinsics
④ 选择 pallet: evm
⑤ 选择方法: call
⑥ 填写参数:
   - source: <你的EVM地址>
   - target: ${evmCaller ? await evmCaller.getAddress() : "<EVMCaller合约地址>"}
   - input: <编码后的函数调用数据（见下方）>
   - value: 0
   - gasLimit: 100000
   - maxFeePerGas: 1000000000 (1 Gwei)
   - maxPriorityFeePerGas: 0
   - nonce: null (自动)
   - accessList: []

如何编码 input 数据：
  const iface = new ethers.Interface(EVMCaller_ABI);
  const data = iface.encodeFunctionData(
    "recordSubstrateCall",
    ["hello from substrate!", 42]
  );
  // 这个 data 就是你要填入 input 的值

方法2: 使用 XCM（跨链场景）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
通过 XCM 的 Transact 指令，可以从任意平行链
触发目标链上的 EVM 合约调用。
这需要构造 XCM 消息，指定 EVM Pallet 的 call。
详情参考：https://docs.moonbeam.network/builders/interoperability/xcm/
`);

    console.log("✅ 部署完成！");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });