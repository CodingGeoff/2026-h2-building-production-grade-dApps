const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("UniswapV2 Tests", function () {
  let factory, router, tokenA, tokenB, pair;
  let deployer, addr1, addr2;

  beforeEach(async () => {
    [deployer, addr1, addr2] = await ethers.getSigners();

    // Deploy Test Tokens
    const TokenFactory = await ethers.getContractFactory("TestToken");
    tokenA = await TokenFactory.deploy(ethers.parseEther("1000"));
    tokenB = await TokenFactory.deploy(ethers.parseEther("1000"));
    
    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();

    // Deploy Factory
    const FactoryFactory = await ethers.getContractFactory("UniswapV2Factory");
    factory = await FactoryFactory.deploy(deployer.address);
    await factory.waitForDeployment();

    // Deploy Router
    const RouterFactory = await ethers.getContractFactory("UniswapV2Router");
    router = await RouterFactory.deploy(factory.target, ethers.ZeroAddress);
    await router.waitForDeployment();
  });

  describe("Factory", function () {
    it("Should create a pair", async function () {
      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      
      const tx = await factory.createPair(tokenAAddr, tokenBAddr);
      const receipt = await tx.wait();

      const pairAddr = await factory.getPair(tokenAAddr, tokenBAddr);
      expect(pairAddr).not.to.equal(ethers.ZeroAddress);
    });

    it("Should not allow duplicate pairs", async function () {
      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      
      await factory.createPair(tokenAAddr, tokenBAddr);
      
      await expect(
        factory.createPair(tokenAAddr, tokenBAddr)
      ).to.be.revertedWith("UniswapV2: PAIR_EXISTS");
    });

    it("Should not allow identical tokens", async function () {
      const tokenAAddr = await tokenA.getAddress();
      
      await expect(
        factory.createPair(tokenAAddr, tokenAAddr)
      ).to.be.revertedWith("UniswapV2: IDENTICAL_ADDRESSES");
    });
  });

  describe("Router", function () {
    beforeEach(async () => {
      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      
      const pairAddr = await factory.getPair(tokenAAddr, tokenBAddr);
      if (pairAddr === ethers.ZeroAddress) {
        await factory.createPair(tokenAAddr, tokenBAddr);
      }
      
      pair = await ethers.getContractAt("UniswapV2Pair", await factory.getPair(tokenAAddr, tokenBAddr));
    });

    it("Should add liquidity", async function () {
      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("100");

      // Approve tokens
      await tokenA.approve(router.target, amountA);
      await tokenB.approve(router.target, amountB);

      // Add liquidity
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 1000;
      const tx = await router.addLiquidity(
        tokenAAddr,
        tokenBAddr,
        amountA,
        amountB,
        0,
        0,
        deployer.address,
        deadline
      );

      await tx.wait();

      // Check pair balances
      const reserveA = await tokenA.balanceOf(pair.target);
      const reserveB = await tokenB.balanceOf(pair.target);
      
      expect(reserveA).to.equal(amountA);
      expect(reserveB).to.equal(amountB);
    });

    it("Should swap tokens correctly", async function () {
      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      
      // First add liquidity
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("100");

      await tokenA.approve(router.target, amountA);
      await tokenB.approve(router.target, amountB);

      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 1000;
      await router.addLiquidity(
        tokenAAddr,
        tokenBAddr,
        amountA,
        amountB,
        0,
        0,
        deployer.address,
        deadline
      );

      // Now swap
      const swapAmount = ethers.parseEther("10");
      await tokenA.approve(router.target, swapAmount);

      const path = [tokenAAddr, tokenBAddr];
      const amounts = await router.getAmountsOut(swapAmount, path);
      
      expect(amounts[1]).to.be.greaterThan(0);

      const tx = await router.swapExactTokensForTokens(
        swapAmount,
        0,
        path,
        deployer.address,
        deadline
      );

      await tx.wait();
    });

    it("Should remove liquidity", async function () {
      const tokenAAddr = await tokenA.getAddress();
      const tokenBAddr = await tokenB.getAddress();
      
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("100");

      await tokenA.approve(router.target, amountA);
      await tokenB.approve(router.target, amountB);

      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 1000;
      const addTx = await router.addLiquidity(
        tokenAAddr,
        tokenBAddr,
        amountA,
        amountB,
        0,
        0,
        deployer.address,
        deadline
      );

      await addTx.wait();

      // Get LP tokens
      const lpBalance = await pair.balanceOf(deployer.address);
      
      // Approve LP tokens
      await pair.approve(router.target, lpBalance);

      // Remove liquidity
      const removeTx = await router.removeLiquidity(
        tokenAAddr,
        tokenBAddr,
        lpBalance,
        0,
        0,
        deployer.address,
        deadline
      );

      await removeTx.wait();

      // Check LP balance is 0
      const newLpBalance = await pair.balanceOf(deployer.address);
      expect(newLpBalance).to.equal(0);
    });
  });

  describe("Token Tests", function () {
    it("Should transfer tokens", async function () {
      const amount = ethers.parseEther("100");
      const initialBalance = await tokenA.balanceOf(addr1.address);
      
      await tokenA.transfer(addr1.address, amount);
      
      const finalBalance = await tokenA.balanceOf(addr1.address);
      expect(finalBalance).to.equal(initialBalance + amount);
    });

    it("Should approve and transferFrom", async function () {
      const amount = ethers.parseEther("100");
      
      await tokenA.approve(addr1.address, amount);
      
      const allowance = await tokenA.allowance(deployer.address, addr1.address);
      expect(allowance).to.equal(amount);

      await tokenA.connect(addr1).transferFrom(deployer.address, addr2.address, amount);
      
      const balance = await tokenA.balanceOf(addr2.address);
      expect(balance).to.equal(amount);
    });
  });
});