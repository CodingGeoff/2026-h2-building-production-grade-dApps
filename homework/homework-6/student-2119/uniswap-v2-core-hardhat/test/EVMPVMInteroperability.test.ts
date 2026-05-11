import { expect } from "chai";
import { ethers } from "hardhat";
import type {
  CrossChainSwap,
  EVMToPVMBridge,
  MockBridgeGateway,
  PVMBridgeReceiver,
} from "../typechain-types";

describe("EVM–PVM interoperability (Solidity model)", function () {
  let evmBridge: EVMToPVMBridge;
  let pvmReceiver: PVMBridgeReceiver;
  let deployer: Awaited<ReturnType<typeof ethers.getSigners>>[0];
  let user1: Awaited<ReturnType<typeof ethers.getSigners>>[1];
  let user2: Awaited<ReturnType<typeof ethers.getSigners>>[2];

  beforeEach(async () => {
    [deployer, user1, user2] = await ethers.getSigners();

    const EVMBridge = await ethers.getContractFactory("EVMToPVMBridge");
    evmBridge = await EVMBridge.deploy(deployer.address, ethers.ZeroAddress);
    await evmBridge.waitForDeployment();

    const PVMRecv = await ethers.getContractFactory("PVMBridgeReceiver");
    pvmReceiver = await PVMRecv.deploy(await evmBridge.getAddress(), deployer.address);
    await pvmReceiver.waitForDeployment();

    await evmBridge.setPVMReceiver(await pvmReceiver.getAddress());
  });

  describe("EVM bridge balances", function () {
    it("deposits and withdraws", async function () {
      const amount = ethers.parseEther("100");
      await evmBridge.connect(user1).deposit(amount);
      expect(await evmBridge.getBalance(user1.address)).to.equal(amount);

      await evmBridge.connect(user1).withdraw(ethers.parseEther("50"));
      expect(await evmBridge.getBalance(user1.address)).to.equal(
        ethers.parseEther("50"),
      );
    });

    it("reverts oversized withdraw", async function () {
      const amount = ethers.parseEther("100");
      await evmBridge.connect(user1).deposit(amount);

      await expect(
        evmBridge.connect(user1).withdraw(ethers.parseEther("150")),
      ).to.be.revertedWith("Insufficient balance");
    });

    it("locks toward PVM and emits MessageSentToPVM", async function () {
      const amount = ethers.parseEther("100");
      await evmBridge.connect(user1).deposit(amount);

      await expect(
        evmBridge.connect(user1).bridgeTowardsPVM(user2.address, amount, "0x"),
      ).to.emit(evmBridge, "MessageSentToPVM");
    });
  });

  describe("EVM ← simulated PVM (relay)", function () {
    it("bridgeFromPVM credits recipient once", async function () {
      const amount = ethers.parseEther("100");
      await evmBridge.connect(user1).deposit(amount);

      const tx = await evmBridge
        .connect(user1)
        .bridgeTowardsPVM(user2.address, amount, "0x");
      await tx.wait();

      const filter = evmBridge.filters.MessageSentToPVM();
      const events = await evmBridge.queryFilter(filter);
      const messageId = events[events.length - 1].args.messageId;

      await evmBridge.bridgeFromPVM(
        messageId,
        user1.address,
        user2.address,
        amount,
        "0x",
      );

      expect(await evmBridge.getBalance(user2.address)).to.equal(amount);
    });

    it("does not execute same message twice", async function () {
      const amount = ethers.parseEther("100");
      await evmBridge.connect(user1).deposit(amount);

      const tx = await evmBridge
        .connect(user1)
        .bridgeTowardsPVM(user2.address, amount, "0x");
      await tx.wait();

      const filter = evmBridge.filters.MessageSentToPVM();
      const events = await evmBridge.queryFilter(filter);
      const messageId = events[events.length - 1].args.messageId;

      await evmBridge.bridgeFromPVM(
        messageId,
        user1.address,
        user2.address,
        amount,
        "0x",
      );

      await expect(
        evmBridge.bridgeFromPVM(
          messageId,
          user1.address,
          user2.address,
          amount,
          "0x",
        ),
      ).to.be.revertedWith("Message already executed");
    });
  });

  describe("PVM receiver (only gateway)", function () {
    it("credits recipient when gateway calls", async function () {
      const amount = ethers.parseEther("100");
      await pvmReceiver
        .connect(deployer)
        .handleCrossChainMessage(user1.address, user2.address, amount, "0x");

      expect(await pvmReceiver.getBalance(user2.address)).to.equal(amount);
    });

    it("user can sendBackToEVM after receiving on PVM", async function () {
      const amount = ethers.parseEther("100");
      await pvmReceiver
        .connect(deployer)
        .handleCrossChainMessage(user1.address, user2.address, amount, "0x");

      await expect(
        pvmReceiver.connect(user2).sendBackToEVM(user1.address, amount, "0x"),
      ).to.emit(pvmReceiver, "TokensSent");
    });
  });

  describe("CrossChainSwap + bridgeTowardsPVMAs", function () {
    let swap: CrossChainSwap;

    beforeEach(async () => {
      const CrossChainSwapF = await ethers.getContractFactory("CrossChainSwap");
      swap = await CrossChainSwapF.deploy(
        await evmBridge.getAddress(),
        await pvmReceiver.getAddress(),
      );
      await swap.waitForDeployment();

      await evmBridge.setTrustedSwapRouter(await swap.getAddress());
    });

    it("initiates swap after user funded bridge balance", async function () {
      const amountIn = ethers.parseEther("100");
      const minAmountOut = ethers.parseEther("50");
      const latest = await ethers.provider.getBlock("latest");
      const deadline = BigInt(latest!.timestamp) + 3600n;

      await evmBridge.connect(user1).deposit(amountIn);

      const tx = await swap
        .connect(user1)
        .initiateSwap(
          ethers.ZeroAddress,
          ethers.ZeroAddress,
          amountIn,
          minAmountOut,
          deadline,
        );
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      const iface = swap.interface;
      const parsed = receipt!.logs
        .map((log) => {
          try {
            return iface.parseLog({
              topics: [...log.topics],
              data: log.data,
            });
          } catch {
            return null;
          }
        })
        .find((p) => p?.name === "SwapInitiated");
      expect(parsed).to.not.equal(undefined);
    });

    it("rejects expired swap", async function () {
      const amountIn = ethers.parseEther("100");
      const minAmountOut = ethers.parseEther("50");
      const deadline = (await ethers.provider.getBlock("latest"))!.timestamp - 1;

      await evmBridge.connect(user1).deposit(amountIn);

      await expect(
        swap
          .connect(user1)
          .initiateSwap(
            ethers.ZeroAddress,
            ethers.ZeroAddress,
            amountIn,
            minAmountOut,
            deadline,
          ),
      ).to.be.revertedWith("Swap expired");
    });
  });
});

describe("MockBridgeGateway", function () {
  it("sendMessage stores payload", async function () {
    const MockGateway = await ethers.getContractFactory("MockBridgeGateway");
    const gateway = (await MockGateway.deploy()) as MockBridgeGateway;
    await gateway.waitForDeployment();

    const [, user] = await ethers.getSigners();

    const tx = await gateway.sendMessage(user.address, "0x1234", 200000);
    const receipt = await tx.wait();
    expect(receipt?.status).to.equal(1);
  });
});
