const { expect } = require("chai");
const hre = require("hardhat");

function encodeMessage(text) {
  return hre.ethers.id(text);
}

async function deployMailbox(contractName, label) {
  const Contract = await hre.ethers.getContractFactory(contractName);
  const mailbox = await Contract.deploy(label);
  await mailbox.waitForDeployment();
  return mailbox;
}

describe("EVM/PVM interop example", function () {
  it("lets the EVM mailbox call the PVM mailbox and receive a reply", async function () {
    const [sender] = await hre.ethers.getSigners();
    const evmMailbox = await deployMailbox("EvmMailbox", "EVM");
    const pvmMailbox = await deployMailbox("PvmMailbox", "PVM");
    const message = encodeMessage("hello-pvm");

    await evmMailbox.setPvmMailbox(await pvmMailbox.getAddress());

    await expect(evmMailbox.connect(sender).sendToPvm(message))
      .to.emit(evmMailbox, "ReplyFromPvm")
      .withArgs(await pvmMailbox.getAddress(), message, encodeMessage("PVM:reply"));

    expect(await pvmMailbox.lastEvmSender()).to.equal(sender.address);
    expect(await pvmMailbox.lastMessage()).to.equal(message);
  });

  it("lets the PVM mailbox call the EVM mailbox and receive a reply", async function () {
    const [sender] = await hre.ethers.getSigners();
    const evmMailbox = await deployMailbox("EvmMailbox", "EVM");
    const pvmMailbox = await deployMailbox("PvmMailbox", "PVM");
    const message = encodeMessage("hello-evm");

    await pvmMailbox.setEvmMailbox(await evmMailbox.getAddress());

    await expect(pvmMailbox.connect(sender).sendToEvm(message))
      .to.emit(pvmMailbox, "ReplyFromEvm")
      .withArgs(await evmMailbox.getAddress(), message, encodeMessage("EVM:reply"));

    expect(await evmMailbox.lastPvmSender()).to.equal(sender.address);
    expect(await evmMailbox.lastMessage()).to.equal(message);
  });

  it("rejects callbacks from untrusted peers", async function () {
    const [, attacker] = await hre.ethers.getSigners();
    const evmMailbox = await deployMailbox("EvmMailbox", "EVM");
    const pvmMailbox = await deployMailbox("PvmMailbox", "PVM");

    await expect(
      evmMailbox.connect(attacker).receiveFromPvm(attacker.address, encodeMessage("bad"))
    ).to.be.revertedWith("EVM: untrusted PVM caller");

    await expect(
      pvmMailbox.connect(attacker).receiveFromEvm(attacker.address, encodeMessage("bad"))
    ).to.be.revertedWith("PVM: untrusted EVM caller");
  });
});
