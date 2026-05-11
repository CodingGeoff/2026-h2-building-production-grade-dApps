// test/UniswapV2.test.js
// ================================================================
// Uniswap V2 完整测试套件
//
// 测试覆盖：
// 1. 工厂合约功能
// 2. 交易对创建
// 3. 添加流动性 & LP Token 验证
// 4. 代币兑换（swap）
// 5. 移除流动性
// 6. Library 函数验证
//
// 注意：不使用 loadFixture（波卡不支持）
// 每个 describe 块用 beforeEach 单独部署
// ================================================================

const { expect } = require("chai");
const { ethers } = require("hardhat");

// 格式化 ETH 数量（便于日志）
const fmt = (n) => ethers.formatEther(n);

// 统一的部署函数（避免 loadFixture）
async function deployAll() {
    const [owner, user1, user2] = await ethers.getSigners();

    // 部署测试代币
    const ERC20 = await ethers.getContractFactory("TestERC20");
    const tokenA = await ERC20.deploy("Token Alpha", "ALPHA", "1000000");
    const tokenB = await ERC20.deploy("Token Beta", "BETA", "1000000");
    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();

    // 部署 WETH
    const WETH = await ethers.getContractFactory("WETH");
    const weth = await WETH.deploy();
    await weth.waitForDeployment();

    // 部署 Factory
    const Factory = await ethers.getContractFactory("UniswapV2Factory");
    const factory = await Factory.deploy(owner.address);
    await factory.waitForDeployment();

    // 计算 INIT_CODE_HASH
    const Pair = await ethers.getContractFactory("UniswapV2Pair");
    const initCodeHash = ethers.keccak256(Pair.bytecode);

    // 部署 Router
    const Router = await ethers.getContractFactory("UniswapV2Router02");
    const router = await Router.deploy(
        await factory.getAddress(),
        await weth.getAddress()
    );
    await router.waitForDeployment();

    return {
        owner, user1, user2,
        tokenA, tokenB, weth,
        factory, router,
        initCodeHash,
        Pair
    };
}

// ================================================================
// 测试套件 1：基础合约部署验证
// ================================================================
describe("1. 基础部署验证", function () {
    this.timeout(120000); // 120 秒超时

    let contracts;
    beforeEach(async function () {
        contracts = await deployAll();
    });

    it("1.1 Factory 应正确部署，feeToSetter 是 owner", async function () {
        const { factory, owner } = contracts;
        expect(await factory.feeToSetter()).to.equal(owner.address);
        expect(await factory.feeTo()).to.equal(ethers.ZeroAddress);
        expect(await factory.allPairsLength()).to.equal(0n);
        console.log(`      ✓ Factory 地址: ${await factory.getAddress()}`);
    });

    it("1.2 Router 应正确部署，factory 和 WETH 地址正确", async function () {
        const { router, factory, weth } = contracts;
        expect(await router.factory()).to.equal(await factory.getAddress());
        expect(await router.WETH()).to.equal(await weth.getAddress());
        console.log(`      ✓ Router 地址: ${await router.getAddress()}`);
    });

    it("1.3 测试代币应正确铸造初始供应量", async function () {
        const { tokenA, tokenB, owner } = contracts;
        const expectedSupply = ethers.parseEther("1000000");
        expect(await tokenA.balanceOf(owner.address)).to.equal(expectedSupply);
        expect(await tokenB.balanceOf(owner.address)).to.equal(expectedSupply);
        console.log(`      ✓ 两个代币各有 1,000,000 枚`);
    });

    it("1.4 正确计算并展示 INIT_CODE_HASH", async function () {
        const { initCodeHash } = contracts;
        expect(initCodeHash).to.have.lengthOf(66); // 0x + 64个hex字符
        console.log(`      ✓ INIT_CODE_HASH: ${initCodeHash}`);
        console.log(`        这个值必须填入 UniswapV2Library.PAIR_CODE_HASH！`);
    });
});

// ================================================================
// 测试套件 2：交易对创建
// ================================================================
describe("2. 交易对创建", function () {
    this.timeout(120000);

    let contracts;
    beforeEach(async function () {
        contracts = await deployAll();
    });

    it("2.1 Factory.createPair 应成功创建交易对", async function () {
        const { factory, tokenA, tokenB } = contracts;
        const tokenAAddr = await tokenA.getAddress();
        const tokenBAddr = await tokenB.getAddress();

        // 创建前，pair 地址应为零地址
        expect(await factory.getPair(tokenAAddr, tokenBAddr))
            .to.equal(ethers.ZeroAddress);

        // 创建交易对
        const tx = await factory.createPair(tokenAAddr, tokenBAddr);
        const receipt = await tx.wait();

        // 检查事件
        const event = receipt.logs.find(log => {
            try {
                const parsed = factory.interface.parseLog(log);
                return parsed?.name === 'PairCreated';
            } catch { return false; }
        });
        expect(event).to.not.be.undefined;

        // 验证 pair 地址已注册
        const pairAddress = await factory.getPair(tokenAAddr, tokenBAddr);
        expect(pairAddress).to.not.equal(ethers.ZeroAddress);
        expect(await factory.allPairsLength()).to.equal(1n);

        console.log(`      ✓ 交易对已创建: ${pairAddress}`);
        console.log(`      ✓ Gas 用量: ${receipt.gasUsed}`);
    });

    it("2.2 交易对排序应一致（A+B 和 B+A 得到同一个 pair）", async function () {
        const { factory, tokenA, tokenB } = contracts;
        const tokenAAddr = await tokenA.getAddress();
        const tokenBAddr = await tokenB.getAddress();

        await factory.createPair(tokenAAddr, tokenBAddr);

        const pair_AB = await factory.getPair(tokenAAddr, tokenBAddr);
        const pair_BA = await factory.getPair(tokenBAddr, tokenAAddr);

        expect(pair_AB).to.equal(pair_BA);
        console.log(`      ✓ A+B 和 B+A 得到相同 pair: ${pair_AB}`);
    });

    it("2.3 不能创建重复的交易对", async function () {
        const { factory, tokenA, tokenB } = contracts;
        const tokenAAddr = await tokenA.getAddress();
        const tokenBAddr = await tokenB.getAddress();

        await factory.createPair(tokenAAddr, tokenBAddr);

        await expect(factory.createPair(tokenAAddr, tokenBAddr))
            .to.be.revertedWith("UniswapV2: PAIR_EXISTS");
        console.log(`      ✓ 重复创建被正确拒绝`);
    });

    it("2.4 不能用相同地址的两个 token 创建对", async function () {
        const { factory, tokenA } = contracts;
        const tokenAAddr = await tokenA.getAddress();

        await expect(factory.createPair(tokenAAddr, tokenAAddr))
            .to.be.revertedWith("UniswapV2: IDENTICAL_ADDRESSES");
    });
});

// ================================================================
// 测试套件 3：添加流动性 & LP Token 验证（核心测试！）
// ================================================================
describe("3. 添加流动性 & LP Token 验证", function () {
    this.timeout(120000);

    let contracts;
    let pairAddress;

    beforeEach(async function () {
        contracts = await deployAll();
        const { factory, tokenA, tokenB } = contracts;

        // 预先创建交易对
        await factory.createPair(
            await tokenA.getAddress(),
            await tokenB.getAddress()
        );
        pairAddress = await factory.getPair(
            await tokenA.getAddress(),
            await tokenB.getAddress()
        );
    });

    it("3.1 ⭐ 首次添加流动性应铸造 LP Token", async function () {
        const { router, tokenA, tokenB, owner } = contracts;
        const routerAddress = await router.getAddress();
        const tokenAAddr = await tokenA.getAddress();
        const tokenBAddr = await tokenB.getAddress();

        const AMOUNT_A = ethers.parseEther("100");  // 100 ALPHA
        const AMOUNT_B = ethers.parseEther("200");  // 200 BETA

        // 授权
        await tokenA.approve(routerAddress, AMOUNT_A);
        await tokenB.approve(routerAddress, AMOUNT_B);

        const deadline = Math.floor(Date.now() / 1000) + 3600;

        // 记录添加前的状态
        const balanceBefore_A = await tokenA.balanceOf(owner.address);
        const balanceBefore_B = await tokenB.balanceOf(owner.address);

        // 添加流动性
        const tx = await router.addLiquidity(
            tokenAAddr, tokenBAddr,
            AMOUNT_A, AMOUNT_B,
            AMOUNT_A * 95n / 100n,  // 5% 滑点容忍
            AMOUNT_B * 95n / 100n,
            owner.address,
            deadline
        );
        const receipt = await tx.wait();

        console.log(`      ✓ addLiquidity gas: ${receipt.gasUsed}`);

        // 获取 pair 合约
        const pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);

        // 验证 LP Token 余额
        const lpBalance = await pair.balanceOf(owner.address);
        const totalSupply = await pair.totalSupply();
        const MINIMUM_LIQUIDITY = 1000n;

        console.log(`      ✓ LP Token 余额: ${fmt(lpBalance)} UNI-V2`);
        console.log(`      ✓ LP Token 总量: ${fmt(totalSupply)} UNI-V2`);

        // LP Token 应大于 0
        expect(lpBalance).to.be.gt(0n);

        // 总量 = 用户收到的 + 永久锁定的 MINIMUM_LIQUIDITY
        expect(totalSupply).to.equal(lpBalance + MINIMUM_LIQUIDITY);

        // 首次流动性：LP = sqrt(100 * 200) - 1000 ≈ 141421356237...
        // sqrt(100e18 * 200e18) ≈ 141421356237309504880168872...
        // const expectedLP = ethers.toBigInt(
        //     Math.floor(Math.sqrt(Number(ethers.formatEther(AMOUNT_A)) *
        //                          Number(ethers.formatEther(AMOUNT_B))) * 1e18)
        // );

        // ✅ 修复方案：使用 .toFixed(18) 转换为字符串后再由 ethers 解析
        const rawSqrt = Math.sqrt(
            Number(ethers.formatUnits(AMOUNT_A, 18)) * Number(ethers.formatUnits(AMOUNT_B, 18))
        );
        const expectedLP = ethers.parseUnits(rawSqrt.toFixed(18), 18);
        // 允许 0.01% 误差（由于 js 浮点精度）
        const tolerance = expectedLP / 10000n;
        expect(lpBalance).to.be.closeTo(expectedLP - MINIMUM_LIQUIDITY, tolerance);

        // 验证代币已被扣除
        expect(await tokenA.balanceOf(owner.address))
            .to.equal(balanceBefore_A - AMOUNT_A);
        expect(await tokenB.balanceOf(owner.address))
            .to.equal(balanceBefore_B - AMOUNT_B);

        // 验证储备量
        const [reserve0, reserve1] = await pair.getReserves();
        const token0 = await pair.token0();
        const [reserveA, reserveB] = token0 === tokenAAddr
            ? [reserve0, reserve1] : [reserve1, reserve0];

        expect(reserveA).to.equal(AMOUNT_A);
        expect(reserveB).to.equal(AMOUNT_B);
        console.log(`      ✓ 储备量验证正确: ${fmt(reserveA)} ALPHA, ${fmt(reserveB)} BETA`);
    });

    it("3.2 第二次添加流动性应按比例铸造 LP Token", async function () {
        const { router, tokenA, tokenB, owner } = contracts;
        const routerAddress = await router.getAddress();
        const tokenAAddr = await tokenA.getAddress();
        const tokenBAddr = await tokenB.getAddress();
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        const AMOUNT_A_1 = ethers.parseEther("100");
        const AMOUNT_B_1 = ethers.parseEther("200");
        await tokenA.approve(routerAddress, ethers.MaxUint256);
        await tokenB.approve(routerAddress, ethers.MaxUint256);

        // 第一次添加
        await router.addLiquidity(
            tokenAAddr, tokenBAddr,
            AMOUNT_A_1, AMOUNT_B_1,
            0n, 0n, owner.address, deadline
        );

        const pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);
        const lpAfterFirst = await pair.balanceOf(owner.address);
        const supplyAfterFirst = await pair.totalSupply();

        // 第二次添加相同数量
        const AMOUNT_A_2 = ethers.parseEther("50");
        const AMOUNT_B_2 = ethers.parseEther("100");

        await router.addLiquidity(
            tokenAAddr, tokenBAddr,
            AMOUNT_A_2, AMOUNT_B_2,
            0n, 0n, owner.address, deadline
        );

        const lpAfterSecond = await pair.balanceOf(owner.address);
        const additionalLP = lpAfterSecond - lpAfterFirst;

        // 第二次 LP = (AMOUNT_A_2 / reserve_A) * totalSupply = 50% * totalSupply
        const expectedAdditional = supplyAfterFirst / 2n;
        const tolerance = expectedAdditional / 1000n; // 0.1% 容差

        expect(additionalLP).to.be.closeTo(expectedAdditional, tolerance);
        console.log(`      ✓ 第一次 LP: ${fmt(lpAfterFirst)}`);
        console.log(`      ✓ 第二次新增 LP: ${fmt(additionalLP)}`);
        console.log(`      ✓ 符合预期比例（约 50% of 第一次）`);
    });
});

// ================================================================
// 测试套件 4：代币兑换（Swap）
// ================================================================
describe("4. 代币兑换测试", function () {
    this.timeout(120000);

    let contracts;
    let pairAddress;

    beforeEach(async function () {
        contracts = await deployAll();
        const { router, factory, tokenA, tokenB, owner } = contracts;
        const routerAddress = await router.getAddress();
        const tokenAAddr = await tokenA.getAddress();
        const tokenBAddr = await tokenB.getAddress();

        // 添加初始流动性
        await tokenA.approve(routerAddress, ethers.MaxUint256);
        await tokenB.approve(routerAddress, ethers.MaxUint256);

        const deadline = Math.floor(Date.now() / 1000) + 3600;
        await router.addLiquidity(
            tokenAAddr, tokenBAddr,
            ethers.parseEther("1000"),
            ethers.parseEther("1000"),
            0n, 0n, owner.address, deadline
        );

        pairAddress = await factory.getPair(tokenAAddr, tokenBAddr);
    });

    it("4.1 swapExactTokensForTokens 应正确执行兑换", async function () {
        const { router, tokenA, tokenB, owner } = contracts;
        const routerAddress = await router.getAddress();
        const tokenAAddr = await tokenA.getAddress();
        const tokenBAddr = await tokenB.getAddress();
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        const amountIn = ethers.parseEther("10");  // 放入 10 ALPHA

        // 查询理论兑换量
        const path = [tokenAAddr, tokenBAddr];
        const amounts = await router.getAmountsOut(amountIn, path);
        const expectedOut = amounts[1];

        console.log(`      输入: ${fmt(amountIn)} ALPHA`);
        console.log(`      预期输出: ${fmt(expectedOut)} BETA`);
        console.log(`      手续费（0.3%）: ${fmt(amountIn * 3n / 1000n)} ALPHA`);

        const balanceBefore = await tokenB.balanceOf(owner.address);

        // 执行兑换（允许 1% 滑点）
        await router.swapExactTokensForTokens(
            amountIn,
            expectedOut * 99n / 100n,  // 最少接受 99% 的预期输出
            path,
            owner.address,
            deadline
        );

        const balanceAfter = await tokenB.balanceOf(owner.address);
        const actualOut = balanceAfter - balanceBefore;

        expect(actualOut).to.be.gte(expectedOut * 99n / 100n);
        expect(actualOut).to.be.lte(expectedOut * 101n / 100n);

        console.log(`      ✓ 实际获得: ${fmt(actualOut)} BETA`);
        console.log(`      ✓ 兑换成功！符合 AMM 公式`);
    });

    it("4.2 兑换后储备量应正确更新（k 不变式）", async function () {
        const { router, tokenA, tokenB, owner } = contracts;
        const routerAddress = await router.getAddress();
        const tokenAAddr = await tokenA.getAddress();
        const tokenBAddr = await tokenB.getAddress();
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        const pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);

        // 获取兑换前的储备量
        let [r0Before, r1Before] = await pair.getReserves();
        const kBefore = r0Before * r1Before;

        // 执行兑换
        const amountIn = ethers.parseEther("50");
        await router.swapExactTokensForTokens(
            amountIn, 0n,
            [tokenAAddr, tokenBAddr],
            owner.address, deadline
        );

        // 获取兑换后的储备量
        let [r0After, r1After] = await pair.getReserves();
        const kAfter = r0After * r1After;

        // k 值应该增加（因为手续费）
        expect(kAfter).to.be.gte(kBefore);

        console.log(`      ✓ 兑换前 k = ${kBefore}`);
        console.log(`      ✓ 兑换后 k = ${kAfter}`);
        console.log(`      ✓ k 不变式（含手续费增长）验证通过`);
    });
});

// ================================================================
// 测试套件 5：移除流动性
// ================================================================
describe("5. 移除流动性测试", function () {
    this.timeout(120000);

    let contracts;
    let pairAddress;
    const INIT_A = ethers.parseEther("1000");
    const INIT_B = ethers.parseEther("2000");

    beforeEach(async function () {
        contracts = await deployAll();
        const { router, factory, tokenA, tokenB, owner } = contracts;
        const routerAddress = await router.getAddress();
        const tokenAAddr = await tokenA.getAddress();
        const tokenBAddr = await tokenB.getAddress();

        await tokenA.approve(routerAddress, ethers.MaxUint256);
        await tokenB.approve(routerAddress, ethers.MaxUint256);

        const deadline = Math.floor(Date.now() / 1000) + 3600;
        await router.addLiquidity(
            tokenAAddr, tokenBAddr,
            INIT_A, INIT_B,
            0n, 0n, owner.address, deadline
        );

        pairAddress = await factory.getPair(tokenAAddr, tokenBAddr);
    });

    it("5.1 removeLiquidity 应正确返还代币并销毁 LP Token", async function () {
        const { router, tokenA, tokenB, owner } = contracts;
        const routerAddress = await router.getAddress();
        const tokenAAddr = await tokenA.getAddress();
        const tokenBAddr = await tokenB.getAddress();
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        const pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);

        const lpBalance = await pair.balanceOf(owner.address);
        const liquidityToRemove = lpBalance / 2n;  // 移除一半流动性

        // 需要先 approve pair 合约（LP Token 的转移）
        await pair.approve(routerAddress, liquidityToRemove);

        const balBefore_A = await tokenA.balanceOf(owner.address);
        const balBefore_B = await tokenB.balanceOf(owner.address);

        // 移除流动性
        await router.removeLiquidity(
            tokenAAddr, tokenBAddr,
            liquidityToRemove,
            0n, 0n,
            owner.address, deadline
        );

        const balAfter_A = await tokenA.balanceOf(owner.address);
        const balAfter_B = await tokenB.balanceOf(owner.address);

        const received_A = balAfter_A - balBefore_A;
        const received_B = balAfter_B - balBefore_B;

        expect(received_A).to.be.gt(0n);
        expect(received_B).to.be.gt(0n);

        // LP Token 应减少
        const lpAfter = await pair.balanceOf(owner.address);
        expect(lpAfter).to.equal(lpBalance - liquidityToRemove);

        console.log(`      ✓ 取回 TokenA: ${fmt(received_A)}`);
        console.log(`      ✓ 取回 TokenB: ${fmt(received_B)}`);
        console.log(`      ✓ LP Token 减少: ${fmt(liquidityToRemove)}`);
        console.log(`      ✓ 代币比例约为 1:2，与初始添加一致`);

        // 检查比例近似 1:2
        const ratio = Number(received_B) / Number(received_A);
        expect(ratio).to.be.closeTo(2.0, 0.01);
    });
});

// ================================================================
// 测试套件 6：Library 函数验证
// ================================================================
describe("6. Library 函数 & Router 计算验证", function () {
    this.timeout(120000);

    let contracts;
    let pairAddress;

    beforeEach(async function () {
        contracts = await deployAll();
        const { router, factory, tokenA, tokenB, owner } = contracts;
        const routerAddress = await router.getAddress();

        await tokenA.approve(routerAddress, ethers.MaxUint256);
        await tokenB.approve(routerAddress, ethers.MaxUint256);

        const deadline = Math.floor(Date.now() / 1000) + 3600;
        await router.addLiquidity(
            await tokenA.getAddress(),
            await tokenB.getAddress(),
            ethers.parseEther("1000"),
            ethers.parseEther("1000"),
            0n, 0n, owner.address, deadline
        );

        pairAddress = await factory.getPair(
            await tokenA.getAddress(),
            await tokenB.getAddress()
        );
    });

    it("6.1 getAmountsOut 计算结果应符合 AMM 公式", async function () {
        const { router, tokenA, tokenB } = contracts;
        const amountIn = ethers.parseEther("10");
        const path = [await tokenA.getAddress(), await tokenB.getAddress()];

        const amounts = await router.getAmountsOut(amountIn, path);

        // 手动验证：reserveIn=1000, reserveOut=1000, fee=0.3%
        // amountOut = (10 * 997 * 1000) / (1000 * 1000 + 10 * 997)
        // = 9970000 / 1009970 ≈ 9.87...
        const reserveIn = ethers.parseEther("1000");
        const reserveOut = ethers.parseEther("1000");
        const amountInWithFee = amountIn * 997n;
        const numerator = amountInWithFee * reserveOut;
        const denominator = reserveIn * 1000n + amountInWithFee;
        const expectedOut = numerator / denominator;

        expect(amounts[1]).to.equal(expectedOut);
        console.log(`      ✓ 输入 ${fmt(amountIn)} → 输出 ${fmt(amounts[1])}`);
        console.log(`      ✓ 公式验证通过`);
    });

    it("6.2 quote 函数应正确计算等值代币量", async function () {
        const { router } = contracts;
        const amountA = ethers.parseEther("100");
        const reserveA = ethers.parseEther("1000");
        const reserveB = ethers.parseEther("2000");

        const amountB = await router.quote(amountA, reserveA, reserveB);
        // amountB = amountA * reserveB / reserveA = 100 * 2000 / 1000 = 200
        expect(amountB).to.equal(ethers.parseEther("200"));
        console.log(`      ✓ quote(100, 1000, 2000) = ${fmt(amountB)} ✓`);
    });
});