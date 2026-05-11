const { expect } = require("chai");
const hre = require("hardhat");

const {
  deployUniswapV2,
  resolveAddressOption,
  resolveWethAddress,
} = require("../scripts/deployUniswapV2");

describe("deployUniswapV2 script", function () {
  it("rejects invalid required addresses before deploying", function () {
    expect(() => resolveAddressOption("bad-address", "WETH_ADDRESS")).to.throw(
      "WETH_ADDRESS must be a valid address"
    );
  });

  it("uses the Polkadot testnet default WETH address when none is provided", function () {
    expect(resolveWethAddress(undefined, "polkadotTestnet")).to.equal(
      "0x5e6031572A58f02cd73b3bB5523365D77D1Bb1F4"
    );
  });

  it("deploys Factory and Router02 with the same factory address", async function () {
    const [deployer, wethAccount, feeSetter] = await hre.ethers.getSigners();

    // 这里用普通账号地址当 WETH，只校验 Router 构造参数是否正确传进去。
    const deployment = await deployUniswapV2({
      hre,
      wethAddress: wethAccount.address,
      feeToSetter: feeSetter.address,
      silent: true,
    });

    expect(await deployment.factory.feeToSetter()).to.equal(feeSetter.address);
    expect(await deployment.router.factory()).to.equal(deployment.factoryAddress);
    expect(await deployment.router.WETH()).to.equal(wethAccount.address);
    expect(deployment.deployerAddress).to.equal(deployer.address);
  });
});
