const { expect } = require("chai");
const hre = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const { MaxUint256, ZeroAddress } = hre.ethers;

function sortTokenAddresses(tokenA, tokenB) {
  return BigInt(tokenA) < BigInt(tokenB)
    ? [tokenA, tokenB]
    : [tokenB, tokenA];
}

async function deployFactory(feeToSetter) {
  const UniswapV2Factory = await hre.ethers.getContractFactory("UniswapV2Factory");
  const factory = await UniswapV2Factory.deploy(feeToSetter);
  await factory.waitForDeployment();
  return factory;
}

async function deployRouter(factoryAddress, wethAddress) {
  const UniswapV2Router02 = await hre.ethers.getContractFactory("UniswapV2Router02");
  const router = await UniswapV2Router02.deploy(factoryAddress, wethAddress);
  await router.waitForDeployment();
  return router;
}

async function deployToken(name, symbol) {
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const token = await MockERC20.deploy(name, symbol);
  await token.waitForDeployment();
  return token;
}

async function deployWETH() {
  const MockWETH = await hre.ethers.getContractFactory("MockWETH");
  const weth = await MockWETH.deploy();
  await weth.waitForDeployment();
  return weth;
}

async function latestDeadline() {
  const block = await hre.ethers.provider.getBlock("latest");
  return BigInt(block.timestamp + 3600);
}

function getAmountOut(amountIn, reserveIn, reserveOut) {
  const amountInWithFee = amountIn * 997n;
  return (amountInWithFee * reserveOut) / (reserveIn * 1000n + amountInWithFee);
}

function getAmountIn(amountOut, reserveIn, reserveOut) {
  return (reserveIn * amountOut * 1000n) / ((reserveOut - amountOut) * 997n) + 1n;
}

function amountByToken(tokenA, tokenB, amountA, amountB, targetToken) {
  return targetToken === tokenA ? amountA : amountB;
}

function asTokenMap(tokenA, tokenB, amountA, amountB) {
  return new Map([
    [tokenA, amountA],
    [tokenB, amountB],
  ]);
}

async function createPair(factory, tokenA, tokenB) {
  await factory.createPair(await tokenA.getAddress(), await tokenB.getAddress());
  const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
  const pair = await hre.ethers.getContractAt("UniswapV2Pair", pairAddress);
  return { pair, pairAddress };
}

async function addPairLiquidity(factory, tokenA, tokenB, provider, amountA, amountB) {
  const { pair, pairAddress } = await createPair(factory, tokenA, tokenB);
  await tokenA.mint(provider.address, amountA);
  await tokenB.mint(provider.address, amountB);
  await tokenA.connect(provider).transfer(pairAddress, amountA);
  await tokenB.connect(provider).transfer(pairAddress, amountB);
  await pair.connect(provider).mint(provider.address);
  return { pair, pairAddress };
}

async function prepareRouterWithTokens() {
  const [deployer, liquidityProvider, trader] = await hre.ethers.getSigners();
  const factory = await deployFactory(deployer.address);
  const weth = await deployWETH();
  const router = await deployRouter(await factory.getAddress(), await weth.getAddress());
  const tokenA = await deployToken("Token A", "TKNA");
  const tokenB = await deployToken("Token B", "TKNB");

  return {
    deployer,
    factory,
    liquidityProvider,
    router,
    tokenA,
    tokenB,
    trader,
    weth,
  };
}

describe("UniswapV2Factory", function () {
  it("creates a pair with sorted tokens and records both lookup directions", async function () {
    const [deployer, tokenA, tokenB] = await hre.ethers.getSigners();
    const factory = await deployFactory(deployer.address);
    const [token0, token1] = sortTokenAddresses(tokenA.address, tokenB.address);

    // 交易对地址由 Factory 统一创建，测试两种查询方向，避免调用方传参顺序影响结果。
    await expect(factory.createPair(tokenA.address, tokenB.address))
      .to.emit(factory, "PairCreated")
      .withArgs(token0, token1, anyValue, 1n);

    const pairAddress = await factory.getPair(tokenA.address, tokenB.address);
    const reversePairAddress = await factory.getPair(tokenB.address, tokenA.address);
    const pair = await hre.ethers.getContractAt("UniswapV2Pair", pairAddress);

    expect(pairAddress).to.not.equal(ZeroAddress);
    expect(reversePairAddress).to.equal(pairAddress);
    expect(await factory.allPairs(0)).to.equal(pairAddress);
    expect(await factory.allPairsLength()).to.equal(1n);
    expect(await pair.factory()).to.equal(await factory.getAddress());
    expect(await pair.token0()).to.equal(token0);
    expect(await pair.token1()).to.equal(token1);
  });

  it("rejects duplicate, identical and zero-address pairs", async function () {
    const [deployer, tokenA, tokenB] = await hre.ethers.getSigners();
    const factory = await deployFactory(deployer.address);

    await factory.createPair(tokenA.address, tokenB.address);

    await expect(factory.createPair(tokenB.address, tokenA.address)).to.be.revertedWith(
      "UniswapV2: PAIR_EXISTS"
    );
    await expect(factory.createPair(tokenA.address, tokenA.address)).to.be.revertedWith(
      "UniswapV2: IDENTICAL_ADDRESSES"
    );
    await expect(factory.createPair(ZeroAddress, tokenB.address)).to.be.revertedWith(
      "UniswapV2: ZERO_ADDRESS"
    );
  });

  it("allows only feeToSetter to update fee receivers and setter ownership", async function () {
    const [feeToSetter, other, feeReceiver, nextSetter] = await hre.ethers.getSigners();
    const factory = await deployFactory(feeToSetter.address);

    await expect(factory.connect(other).setFeeTo(feeReceiver.address)).to.be.revertedWith(
      "UniswapV2: FORBIDDEN"
    );

    await factory.connect(feeToSetter).setFeeTo(feeReceiver.address);
    expect(await factory.feeTo()).to.equal(feeReceiver.address);

    await factory.connect(feeToSetter).setFeeToSetter(nextSetter.address);
    expect(await factory.feeToSetter()).to.equal(nextSetter.address);

    // setter 转移后，旧地址不能再改配置，防止部署权限被旧账号继续持有。
    await expect(factory.connect(feeToSetter).setFeeTo(other.address)).to.be.revertedWith(
      "UniswapV2: FORBIDDEN"
    );
  });
});

describe("UniswapV2Pair", function () {
  it("mints first liquidity and permanently locks the minimum amount", async function () {
    const [deployer, liquidityProvider] = await hre.ethers.getSigners();
    const factory = await deployFactory(deployer.address);
    const tokenA = await deployToken("Token A", "TKNA");
    const tokenB = await deployToken("Token B", "TKNB");
    const amountA = 10000n;
    const amountB = 40000n;
    const { pair, pairAddress } = await createPair(factory, tokenA, tokenB);
    const [token0, token1] = sortTokenAddresses(await tokenA.getAddress(), await tokenB.getAddress());
    const amounts = asTokenMap(await tokenA.getAddress(), await tokenB.getAddress(), amountA, amountB);

    await tokenA.mint(liquidityProvider.address, amountA);
    await tokenB.mint(liquidityProvider.address, amountB);
    await tokenA.connect(liquidityProvider).transfer(pairAddress, amountA);
    await tokenB.connect(liquidityProvider).transfer(pairAddress, amountB);

    // 第一笔流动性会永久锁住 MINIMUM_LIQUIDITY，测试这里避免 LP 供应量被误算。
    await expect(pair.connect(liquidityProvider).mint(liquidityProvider.address))
      .to.emit(pair, "Mint")
      .withArgs(liquidityProvider.address, amounts.get(token0), amounts.get(token1));

    const [reserve0, reserve1] = await pair.getReserves();
    expect(await pair.balanceOf(liquidityProvider.address)).to.equal(19000n);
    expect(await pair.balanceOf(ZeroAddress)).to.equal(1000n);
    expect(await pair.totalSupply()).to.equal(20000n);
    expect(reserve0).to.equal(amounts.get(token0));
    expect(reserve1).to.equal(amounts.get(token1));
  });

  it("burns liquidity and returns both underlying tokens pro rata", async function () {
    const [deployer, liquidityProvider, receiver] = await hre.ethers.getSigners();
    const factory = await deployFactory(deployer.address);
    const tokenA = await deployToken("Token A", "TKNA");
    const tokenB = await deployToken("Token B", "TKNB");
    const amountA = 10000n;
    const amountB = 40000n;
    const { pair, pairAddress } = await addPairLiquidity(
      factory,
      tokenA,
      tokenB,
      liquidityProvider,
      amountA,
      amountB
    );

    await pair.connect(liquidityProvider).transfer(pairAddress, 5000n);
    await pair.connect(liquidityProvider).burn(receiver.address);

    const [token0, token1] = sortTokenAddresses(await tokenA.getAddress(), await tokenB.getAddress());
    const reserve0Before = amountByToken(
      await tokenA.getAddress(),
      await tokenB.getAddress(),
      amountA,
      amountB,
      token0
    );
    const reserve1Before = amountByToken(
      await tokenA.getAddress(),
      await tokenB.getAddress(),
      amountA,
      amountB,
      token1
    );
    const amount0Out = (5000n * reserve0Before) / 20000n;
    const amount1Out = (5000n * reserve1Before) / 20000n;
    const tokenAOut = amountByToken(token0, token1, amount0Out, amount1Out, await tokenA.getAddress());
    const tokenBOut = amountByToken(token0, token1, amount0Out, amount1Out, await tokenB.getAddress());
    const [reserve0, reserve1] = await pair.getReserves();

    expect(await tokenA.balanceOf(receiver.address)).to.equal(tokenAOut);
    expect(await tokenB.balanceOf(receiver.address)).to.equal(tokenBOut);
    expect(await pair.totalSupply()).to.equal(15000n);
    expect(reserve0).to.equal(reserve0Before - amount0Out);
    expect(reserve1).to.equal(reserve1Before - amount1Out);
  });

  it("swaps tokens while preserving the constant product fee rule", async function () {
    const [deployer, liquidityProvider, trader] = await hre.ethers.getSigners();
    const factory = await deployFactory(deployer.address);
    const tokenA = await deployToken("Token A", "TKNA");
    const tokenB = await deployToken("Token B", "TKNB");
    const amountA = 10000n;
    const amountB = 50000n;
    const amountIn = 1000n;
    const { pair, pairAddress } = await addPairLiquidity(
      factory,
      tokenA,
      tokenB,
      liquidityProvider,
      amountA,
      amountB
    );
    const [token0] = sortTokenAddresses(await tokenA.getAddress(), await tokenB.getAddress());
    const tokenAIsToken0 = (await tokenA.getAddress()) === token0;
    const reserveIn = tokenAIsToken0 ? amountA : amountB;
    const reserveOut = tokenAIsToken0 ? amountB : amountA;
    const amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
    const amount0Out = tokenAIsToken0 ? 0n : amountOut;
    const amount1Out = tokenAIsToken0 ? amountOut : 0n;

    await tokenA.mint(trader.address, amountIn);
    await tokenA.connect(trader).transfer(pairAddress, amountIn);

    // swap 前先把输入转进 Pair，Pair 会按余额差额识别真实输入数量。
    await expect(pair.connect(trader).swap(amount0Out, amount1Out, trader.address, "0x"))
      .to.emit(pair, "Swap")
      .withArgs(
        trader.address,
        tokenAIsToken0 ? amountIn : 0n,
        tokenAIsToken0 ? 0n : amountIn,
        amount0Out,
        amount1Out,
        trader.address
      );

    expect(await tokenB.balanceOf(trader.address)).to.equal(amountOut);
  });
});

describe("UniswapV2Router02", function () {
  it("stores factory and WETH addresses passed at deployment", async function () {
    const [deployer] = await hre.ethers.getSigners();
    const factory = await deployFactory(deployer.address);
    const weth = await deployWETH();
    const factoryAddress = await factory.getAddress();
    const wethAddress = await weth.getAddress();
    const router = await deployRouter(factoryAddress, wethAddress);

    expect(await router.factory()).to.equal(factoryAddress);
    expect(await router.WETH()).to.equal(wethAddress);
  });

  it("calculates quote, exact-input output and exact-output input amounts", async function () {
    const [deployer] = await hre.ethers.getSigners();
    const factory = await deployFactory(deployer.address);
    const weth = await deployWETH();
    const router = await deployRouter(await factory.getAddress(), await weth.getAddress());

    // 这些函数是 Router 暴露的纯计算入口，结果用 UniswapV2 的 0.3% 手续费公式校验。
    expect(await router.quote(100n, 1000n, 5000n)).to.equal(500n);
    expect(await router.getAmountOut(1000n, 10000n, 5000n)).to.equal(453n);
    expect(await router.getAmountIn(453n, 10000n, 5000n)).to.equal(1000n);
  });

  it("rejects invalid quote and amount calculation inputs", async function () {
    const [deployer] = await hre.ethers.getSigners();
    const factory = await deployFactory(deployer.address);
    const weth = await deployWETH();
    const router = await deployRouter(await factory.getAddress(), await weth.getAddress());

    await expect(router.quote(0n, 1000n, 5000n)).to.be.revertedWith(
      "UniswapV2Library: INSUFFICIENT_AMOUNT"
    );
    await expect(router.getAmountOut(1000n, 0n, 5000n)).to.be.revertedWith(
      "UniswapV2Library: INSUFFICIENT_LIQUIDITY"
    );
    await expect(router.getAmountIn(0n, 10000n, 5000n)).to.be.revertedWith(
      "UniswapV2Library: INSUFFICIENT_OUTPUT_AMOUNT"
    );
  });

  it("adds token-token liquidity through Router02 and mints LP tokens", async function () {
    const { factory, liquidityProvider, router, tokenA, tokenB } =
      await prepareRouterWithTokens();
    const amountA = 10000n;
    const amountB = 40000n;

    await tokenA.mint(liquidityProvider.address, amountA);
    await tokenB.mint(liquidityProvider.address, amountB);
    await tokenA.connect(liquidityProvider).approve(await router.getAddress(), MaxUint256);
    await tokenB.connect(liquidityProvider).approve(await router.getAddress(), MaxUint256);

    await router
      .connect(liquidityProvider)
      .addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amountA,
        amountB,
        amountA,
        amountB,
        liquidityProvider.address,
        await latestDeadline()
      );

    const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
    const pair = await hre.ethers.getContractAt("UniswapV2Pair", pairAddress);
    const [reserve0, reserve1] = await pair.getReserves();

    expect(pairAddress).to.not.equal(ZeroAddress);
    expect(await pair.balanceOf(liquidityProvider.address)).to.equal(19000n);
    expect(await pair.totalSupply()).to.equal(20000n);
    expect(reserve0 * reserve1).to.equal(amountA * amountB);
  });

  it("swaps exact tokens through Router02 and updates the recipient balance", async function () {
    const { liquidityProvider, router, tokenA, tokenB, trader } =
      await prepareRouterWithTokens();
    const amountA = 10000n;
    const amountB = 50000n;
    const amountIn = 1000n;
    const amountOut = getAmountOut(amountIn, amountA, amountB);

    await tokenA.mint(liquidityProvider.address, amountA);
    await tokenB.mint(liquidityProvider.address, amountB);
    await tokenA.connect(liquidityProvider).approve(await router.getAddress(), MaxUint256);
    await tokenB.connect(liquidityProvider).approve(await router.getAddress(), MaxUint256);
    await router
      .connect(liquidityProvider)
      .addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amountA,
        amountB,
        amountA,
        amountB,
        liquidityProvider.address,
        await latestDeadline()
      );

    await tokenA.mint(trader.address, amountIn);
    await tokenA.connect(trader).approve(await router.getAddress(), MaxUint256);
    await router
      .connect(trader)
      .swapExactTokensForTokens(
        amountIn,
        amountOut,
        [await tokenA.getAddress(), await tokenB.getAddress()],
        trader.address,
        await latestDeadline()
      );

    expect(await tokenB.balanceOf(trader.address)).to.equal(amountOut);
  });

  it("removes token-token liquidity through Router02 and returns both tokens", async function () {
    const { factory, liquidityProvider, router, tokenA, tokenB, trader } =
      await prepareRouterWithTokens();
    const amountA = 10000n;
    const amountB = 40000n;

    await tokenA.mint(liquidityProvider.address, amountA);
    await tokenB.mint(liquidityProvider.address, amountB);
    await tokenA.connect(liquidityProvider).approve(await router.getAddress(), MaxUint256);
    await tokenB.connect(liquidityProvider).approve(await router.getAddress(), MaxUint256);
    await router
      .connect(liquidityProvider)
      .addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amountA,
        amountB,
        amountA,
        amountB,
        liquidityProvider.address,
        await latestDeadline()
      );

    const pairAddress = await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress());
    const pair = await hre.ethers.getContractAt("UniswapV2Pair", pairAddress);
    const liquidity = await pair.balanceOf(liquidityProvider.address);
    const totalSupply = await pair.totalSupply();
    const expectedA = (liquidity * amountA) / totalSupply;
    const expectedB = (liquidity * amountB) / totalSupply;

    await pair.connect(liquidityProvider).approve(await router.getAddress(), liquidity);
    await router
      .connect(liquidityProvider)
      .removeLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        liquidity,
        expectedA,
        expectedB,
        trader.address,
        await latestDeadline()
      );

    expect(await tokenA.balanceOf(trader.address)).to.equal(expectedA);
    expect(await tokenB.balanceOf(trader.address)).to.equal(expectedB);
    expect(await pair.balanceOf(liquidityProvider.address)).to.equal(0n);
  });

  it("adds ETH liquidity and swaps ETH for tokens through Router02", async function () {
    const { liquidityProvider, router, tokenA, trader, weth } =
      await prepareRouterWithTokens();
    const tokenAmount = 10000n;
    const ethAmount = 50000n;
    const ethSwapIn = 1000n;
    const expectedTokenOut = getAmountOut(ethSwapIn, ethAmount, tokenAmount);

    await tokenA.mint(liquidityProvider.address, tokenAmount);
    await tokenA.connect(liquidityProvider).approve(await router.getAddress(), MaxUint256);

    // 这里覆盖 ETH -> WETH -> Pair 的路径，确保 Router 的 payable 分支真的走通。
    await router
      .connect(liquidityProvider)
      .addLiquidityETH(
        await tokenA.getAddress(),
        tokenAmount,
        tokenAmount,
        ethAmount,
        liquidityProvider.address,
        await latestDeadline(),
        { value: ethAmount }
      );

    await router
      .connect(trader)
      .swapExactETHForTokens(
        expectedTokenOut,
        [await weth.getAddress(), await tokenA.getAddress()],
        trader.address,
        await latestDeadline(),
        { value: ethSwapIn }
      );

    expect(await tokenA.balanceOf(trader.address)).to.equal(expectedTokenOut);
  });

  it("removes ETH liquidity through Router02 and unwraps WETH for the receiver", async function () {
    const { factory, liquidityProvider, router, tokenA, trader, weth } =
      await prepareRouterWithTokens();
    const tokenAmount = 10000n;
    const ethAmount = 50000n;

    await tokenA.mint(liquidityProvider.address, tokenAmount);
    await tokenA.connect(liquidityProvider).approve(await router.getAddress(), MaxUint256);
    await router
      .connect(liquidityProvider)
      .addLiquidityETH(
        await tokenA.getAddress(),
        tokenAmount,
        tokenAmount,
        ethAmount,
        liquidityProvider.address,
        await latestDeadline(),
        { value: ethAmount }
      );

    const pairAddress = await factory.getPair(await tokenA.getAddress(), await weth.getAddress());
    const pair = await hre.ethers.getContractAt("UniswapV2Pair", pairAddress);
    const liquidity = await pair.balanceOf(liquidityProvider.address);
    const totalSupply = await pair.totalSupply();
    const expectedToken = (liquidity * tokenAmount) / totalSupply;
    const expectedEth = (liquidity * ethAmount) / totalSupply;
    const ethBefore = await hre.ethers.provider.getBalance(trader.address);

    await pair.connect(liquidityProvider).approve(await router.getAddress(), liquidity);

    // removeLiquidityETH 会先取回 WETH，再解包成原生币转给接收方。
    await router
      .connect(liquidityProvider)
      .removeLiquidityETH(
        await tokenA.getAddress(),
        liquidity,
        expectedToken,
        expectedEth,
        trader.address,
        await latestDeadline()
      );

    const ethAfter = await hre.ethers.provider.getBalance(trader.address);
    expect(await tokenA.balanceOf(trader.address)).to.equal(expectedToken);
    expect(ethAfter - ethBefore).to.equal(expectedEth);
  });

  it("swaps exact tokens for ETH through Router02", async function () {
    const { liquidityProvider, router, tokenA, trader, weth } =
      await prepareRouterWithTokens();
    const [, , , receiver] = await hre.ethers.getSigners();
    const tokenAmount = 10000n;
    const ethAmount = 50000n;
    const tokenSwapIn = 1000n;
    const expectedEthOut = getAmountOut(tokenSwapIn, tokenAmount, ethAmount);

    await tokenA.mint(liquidityProvider.address, tokenAmount);
    await tokenA.connect(liquidityProvider).approve(await router.getAddress(), MaxUint256);
    await router
      .connect(liquidityProvider)
      .addLiquidityETH(
        await tokenA.getAddress(),
        tokenAmount,
        tokenAmount,
        ethAmount,
        liquidityProvider.address,
        await latestDeadline(),
        { value: ethAmount }
      );

    await tokenA.mint(trader.address, tokenSwapIn);
    await tokenA.connect(trader).approve(await router.getAddress(), MaxUint256);

    const ethBefore = await hre.ethers.provider.getBalance(receiver.address);
    await router
      .connect(trader)
      .swapExactTokensForETH(
        tokenSwapIn,
        expectedEthOut,
        [await tokenA.getAddress(), await weth.getAddress()],
        receiver.address,
        await latestDeadline()
      );
    const ethAfter = await hre.ethers.provider.getBalance(receiver.address);

    expect(ethAfter - ethBefore).to.equal(expectedEthOut);
  });
});
