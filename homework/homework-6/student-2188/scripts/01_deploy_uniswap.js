// scripts/01_deploy_uniswap.js
// ================================================================
// Uniswap V2 完整部署脚本
//
// 执行步骤：
// 1. 部署 TestERC20 (TokenA, TokenB)
// 2. 部署 WETH
// 3. 部署 UniswapV2Factory
// 4. ⭐ 计算 UniswapV2Pair 的真实 INIT_CODE_HASH
// 5. 部署 UniswapV2Router02（使用正确的哈希）
// 6. 执行测试：创建交易对 → 添加流动性 → 验证
// ================================================================

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// 格式化数字为人类可读格式
function formatAmount(amount, decimals = 18) {
    return ethers.formatUnits(amount, decimals);
}

async function main() {
    console.log("=".repeat(60));
    console.log("🚀 Uniswap V2 部署脚本开始");
    console.log("=".repeat(60));

    // ============================================================
    // Step 0: 获取部署账户信息
    // ============================================================
    const [deployer, user1] = await ethers.getSigners();
    console.log("\n📋 部署信息：");
    console.log(`   部署者地址: ${deployer.address}`);
    console.log(`   用户1 地址: ${user1.address}`);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`   部署者余额: ${formatAmount(balance)} ETH/DOT`);
    console.log();

    // ============================================================
    // Step 1: 部署两个测试 ERC20 代币
    // ============================================================
    console.log("📦 Step 1: 部署测试代币...");

    const TestERC20 = await ethers.getContractFactory("TestERC20");

    const tokenA = await TestERC20.deploy(
        "Alpha Token",  // name
        "ALPHA",        // symbol
        "1000000"       // 初始供应量：100万枚
    );
    await tokenA.waitForDeployment();
    console.log(`   ✅ TokenA (ALPHA) 已部署: ${await tokenA.getAddress()}`);

    const tokenB = await TestERC20.deploy(
        "Beta Token",   // name
        "BETA",         // symbol
        "1000000"       // 初始供应量：100万枚
    );
    await tokenB.waitForDeployment();
    console.log(`   ✅ TokenB (BETA)  已部署: ${await tokenB.getAddress()}`);

    // ============================================================
    // Step 2: 部署 WETH
    // ============================================================
    console.log("\n📦 Step 2: 部署 WETH...");

    const WETH = await ethers.getContractFactory("WETH");
    const weth = await WETH.deploy();
    await weth.waitForDeployment();
    console.log(`   ✅ WETH 已部署: ${await weth.getAddress()}`);

    // ============================================================
    // Step 3: 部署 UniswapV2Factory
    // ============================================================
    console.log("\n📦 Step 3: 部署 UniswapV2Factory...");

    const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
    const factory = await UniswapV2Factory.deploy(deployer.address);
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log(`   ✅ UniswapV2Factory 已部署: ${factoryAddress}`);

    // ============================================================
    // Step 4: ⭐ 计算真实的 INIT_CODE_HASH（最关键的步骤！）
    // ============================================================
    console.log("\n🔑 Step 4: 计算 UniswapV2Pair 的 INIT_CODE_HASH...");
    console.log("   (这是修复 UniswapV2Library 的关键步骤)");

    // 获取 UniswapV2Pair 的 artifact（包含完整的字节码）
    const UniswapV2Pair = await ethers.getContractFactory("UniswapV2Pair");

    // creationCode = 部署时用的字节码（包含构造函数）
    const pairBytecode = UniswapV2Pair.bytecode;

    // 计算字节码的 keccak256 哈希
    const INIT_CODE_HASH = ethers.keccak256(pairBytecode);

    console.log(`   📌 Pair bytecode 长度: ${pairBytecode.length / 2 - 1} bytes`);
    console.log(`   🔑 INIT_CODE_HASH = ${INIT_CODE_HASH}`);
    console.log();
    console.log("   ⚠️  重要提示：");
    console.log("   请将 contracts/uniswap/UniswapV2Library.sol 中的");
    console.log("   PAIR_CODE_HASH 替换为以上值！");
    console.log(`   bytes32 internal constant PAIR_CODE_HASH =`);
    console.log(`       hex'${INIT_CODE_HASH.slice(2)}';`);

    // 自动更新 UniswapV2Library.sol 文件中的哈希值
    const libraryPath = path.join(__dirname, "../contracts/uniswap/UniswapV2Library.sol");
    if (fs.existsSync(libraryPath)) {
        let libraryContent = fs.readFileSync(libraryPath, "utf8");
        // 用正则表达式替换占位符哈希
        const oldHashPattern = /hex'[0-9a-fA-F]{64}'/g;
        const newHash = `hex'${INIT_CODE_HASH.slice(2)}'`;
        libraryContent = libraryContent.replace(oldHashPattern, newHash);
        fs.writeFileSync(libraryPath, libraryContent);
        console.log("\n   ✅ 已自动更新 UniswapV2Library.sol！");
    }

    // ============================================================
    // Step 5: 重新编译（因为我们更新了 Library.sol）
    // ============================================================
    console.log("\n📦 Step 5: 使用正确哈希的 Router 部署...");
    console.log("   ⚠️  注意：如果 Library hash 已更新，需要先重新编译！");
    console.log("   运行: npx hardhat compile (如果遇到问题)");

    // 部署 Router02
    const UniswapV2Router02 = await ethers.getContractFactory("UniswapV2Router02");
    const router = await UniswapV2Router02.deploy(
        factoryAddress,
        await weth.getAddress()
    );
    await router.waitForDeployment();
    const routerAddress = await router.getAddress();
    console.log(`   ✅ UniswapV2Router02 已部署: ${routerAddress}`);

    // ============================================================
    // Step 6: 验证 - 创建交易对
    // ============================================================
    console.log("\n🧪 Step 6: 创建 ALPHA/BETA 交易对...");

    const tokenAAddress = await tokenA.getAddress();
    const tokenBAddress = await tokenB.getAddress();

    const createPairTx = await factory.createPair(tokenAAddress, tokenBAddress);
    await createPairTx.wait();

    const pairAddress = await factory.getPair(tokenAAddress, tokenBAddress);
    console.log(`   ✅ 交易对已创建: ${pairAddress}`);
    console.log(`   总交易对数量: ${await factory.allPairsLength()}`);

    // ============================================================
    // Step 7: 验证 - 添加流动性
    // ============================================================
    console.log("\n🧪 Step 7: 添加流动性...");

    const AMOUNT_A = ethers.parseEther("100");  // 100 ALPHA
    const AMOUNT_B = ethers.parseEther("200");  // 200 BETA（价格比 = 1:2）

    // 先授权 Router 转走代币
    console.log("   授权 Router 使用 TokenA...");
    await tokenA.approve(routerAddress, AMOUNT_A);

    console.log("   授权 Router 使用 TokenB...");
    await tokenB.approve(routerAddress, AMOUNT_B);

    // 添加流动性
    console.log("   执行 addLiquidity...");
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 分钟后截止

    const addLiquidityTx = await router.addLiquidity(
        tokenAAddress,          // tokenA
        tokenBAddress,          // tokenB
        AMOUNT_A,               // amountADesired: 期望放入 100 ALPHA
        AMOUNT_B,               // amountBDesired: 期望放入 200 BETA
        AMOUNT_A * 99n / 100n,  // amountAMin: 最少接受 99 ALPHA（1% 滑点）
        AMOUNT_B * 99n / 100n,  // amountBMin: 最少接受 198 BETA
        deployer.address,       // to: LP Token 发到哪里
        deadline                // deadline
    );
    const receipt = await addLiquidityTx.wait();
    console.log(`   ✅ 流动性添加成功！Gas 用量: ${receipt.gasUsed}`);

    // ============================================================
    // Step 8: 验证 LP Token 余额
    // ============================================================
    console.log("\n🔍 Step 8: 验证结果...");

    const pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);

    const lpBalance = await pair.balanceOf(deployer.address);
    const totalSupply = await pair.totalSupply();
    const [reserve0, reserve1] = await pair.getReserves();
    const token0 = await pair.token0();

    console.log(`   LP Token 余额:   ${formatAmount(lpBalance)} UNI-V2`);
    console.log(`   LP Token 总供应: ${formatAmount(totalSupply)} UNI-V2`);
    console.log(`   储备量 (token0): ${formatAmount(reserve0)}`);
    console.log(`   储备量 (token1): ${formatAmount(reserve1)}`);
    console.log(`   token0 地址:     ${token0}`);

    // ============================================================
    // 保存部署结果
    // ============================================================
    const deploymentInfo = {
        network: (await ethers.provider.getNetwork()).name,
        chainId: (await ethers.provider.getNetwork()).chainId.toString(),
        timestamp: new Date().toISOString(),
        contracts: {
            TokenA:  tokenAAddress,
            TokenB:  tokenBAddress,
            WETH:    await weth.getAddress(),
            Factory: factoryAddress,
            Router:  routerAddress,
            Pair:    pairAddress
        },
        initCodeHash: INIT_CODE_HASH
    };

    fs.writeFileSync(
        path.join(__dirname, "../deployment.json"),
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n" + "=".repeat(60));
    console.log("✅ 部署完成！结果已保存到 deployment.json");
    console.log("=".repeat(60));
    console.log("\n📋 合约地址汇总：");
    Object.entries(deploymentInfo.contracts).forEach(([name, addr]) => {
        console.log(`   ${name.padEnd(10)}: ${addr}`);
    });
    console.log(`\n🔑 INIT_CODE_HASH: ${INIT_CODE_HASH}`);
    console.log("\n下一步：运行测试脚本");
    console.log("$ npx hardhat test test/UniswapV2.test.js --network hardhat");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ 部署失败！");
        console.error(error);
        process.exit(1);
    });