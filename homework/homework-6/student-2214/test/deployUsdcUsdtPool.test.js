const { expect } = require("chai");
const hre = require("hardhat");

const {
  deployUsdcUsdtPool,
  parseTokenAmount,
} = require("../scripts/deployUsdcUsdtPool");

async function deployFactory(feeToSetter) {
  const UniswapV2Factory = await hre.ethers.getContractFactory("UniswapV2Factory");
  const factory = await UniswapV2Factory.deploy(feeToSetter);
  await factory.waitForDeployment();
  return factory;
}

async function deployWETH() {
  const MockWETH = await hre.ethers.getContractFactory("MockWETH");
  const weth = await MockWETH.deploy();
  await weth.waitForDeployment();
  return weth;
}

async function deployRouter(factoryAddress, wethAddress) {
  const UniswapV2Router02 = await hre.ethers.getContractFactory("UniswapV2Router02");
  const router = await UniswapV2Router02.deploy(factoryAddress, wethAddress);
  await router.waitForDeployment();
  return router;
}

describe("deployUsdcUsdtPool script", function () {
  it("parses token amounts with 18 decimals", function () {
    expect(parseTokenAmount("1000")).to.equal(1000n * 10n ** 18n);
    expect(parseTokenAmount("1.25")).to.equal(125n * 10n ** 16n);
  });

  it("deploys USDC and USDT, then adds both tokens to a UniswapV2 pool", async function () {
    const [deployer] = await hre.ethers.getSigners();
    const factory = await deployFactory(deployer.address);
    const weth = await deployWETH();
    const router = await deployRouter(await factory.getAddress(), await weth.getAddress());
    const poolAmount = "1000";

    const deployment = await deployUsdcUsdtPool({
      hre,
      routerAddress: await router.getAddress(),
      usdcAmount: poolAmount,
      usdtAmount: poolAmount,
      silent: true,
    });

    // 脚本要把新部署的两个代币按 1:1 注入 Router，并确认 Pair 由 Factory 记录下来。
    expect(await deployment.usdc.symbol()).to.equal("USDC");
    expect(await deployment.usdt.symbol()).to.equal("USDT");
    expect(await factory.getPair(deployment.usdcAddress, deployment.usdtAddress)).to.equal(
      deployment.pairAddress
    );
    expect(await deployment.pair.balanceOf(deployer.address)).to.be.gt(0n);
    expect(await deployment.usdc.balanceOf(deployment.pairAddress)).to.equal(
      parseTokenAmount(poolAmount)
    );
    expect(await deployment.usdt.balanceOf(deployment.pairAddress)).to.equal(
      parseTokenAmount(poolAmount)
    );
  });
});
