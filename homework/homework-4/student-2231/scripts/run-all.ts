/**
 * Homework 4 · All-in-one script
 *
 * 作业要求 (readme):
 *   使用 Ethers, Viem 或者 Web3.py 的任意一个, 完成和区块链的连接, 基本数据查询.
 *   交易发送, 智能合约的部署, 状态读取和更新的操作.
 *
 * 本脚本用 **viem** 一次性演示以下 5 个操作:
 *   1. 连接区块链 (Polkadot Hub TestNet)
 *   2. 基本数据查询 (chainId / block / balance)
 *   3. 部署 Guestbook 合约
 *   4. 发送交易调用 sign(...) 更新状态
 *   5. 读取合约状态 (messageOf / totalSigners)
 *
 * 运行前提:
 *   - 设置环境变量 PRIVATE_KEY (0x 开头的 64 位 hex)
 *   - 账户需要有 Polkadot Hub TestNet 测试币 (从 faucet.polkadot.io 领)
 *   - 合约字节码已经通过 `npm run compile` 生成在 artifacts/ 里
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseAbi,
  getContract,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// ---------- 配置 ----------
const RPC_URL = "https://services.polkadothub-rpc.com/testnet";

const RAW_KEY = process.env.PRIVATE_KEY;
if (!RAW_KEY) {
  console.error("请先设置环境变量 PRIVATE_KEY (0x 开头的 64 位 hex)");
  console.error("  PowerShell:  $env:PRIVATE_KEY=\"0x...\"; npm run run-all");
  console.error("  bash:        PRIVATE_KEY=0x... npm run run-all");
  process.exit(1);
}
const PRIVATE_KEY: Hex = (RAW_KEY.startsWith("0x") ? RAW_KEY : `0x${RAW_KEY}`) as Hex;

// 从 Hardhat 编译产物里读取 ABI + bytecode
type Artifact = { abi: unknown[]; bytecode: Hex };
function loadArtifact(name: string): Artifact {
  const path = resolve(
    process.cwd(),
    `artifacts/contracts/${name}.sol/${name}.json`
  );
  const artifact = JSON.parse(readFileSync(path, "utf8"));
  return { abi: artifact.abi, bytecode: artifact.bytecode as Hex };
}

// Polkadot Hub TestNet chain descriptor (viem 需要)
const passetHub = {
  id: 420420417,
  name: "Polkadot Hub TestNet",
  nativeCurrency: { name: "Paseo DOT", symbol: "PAS", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
} as const;

// ---------- 主流程 ----------

async function main() {
  const banner = "=".repeat(70);

  // ============================================================
  // Step 1: 连接 + 基础查询
  // ============================================================
  console.log(banner);
  console.log("Homework 4 - Student 2231 (using viem)");
  console.log(banner);

  const account = privateKeyToAccount(PRIVATE_KEY);
  const publicClient = createPublicClient({ chain: passetHub, transport: http(RPC_URL) });
  const walletClient = createWalletClient({
    account,
    chain: passetHub,
    transport: http(RPC_URL),
  });

  console.log("\n[Step 1] Connect + basic queries");
  const chainId = await publicClient.getChainId();
  const blockNumber = await publicClient.getBlockNumber();
  const block = await publicClient.getBlock({ blockNumber });
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`  My address:    ${account.address}`);
  console.log(`  Chain ID:      ${chainId}`);
  console.log(`  Head block:    #${blockNumber}  (hash: ${block.hash})`);
  console.log(`  My balance:    ${formatEther(balance)} PAS`);

  if (balance === 0n) {
    console.log("\n⚠  Balance is 0. Please fund this address via https://faucet.polkadot.io/");
    process.exit(1);
  }

  // ============================================================
  // Step 2: 部署 Guestbook
  // ============================================================
  console.log(`\n[Step 2] Deploy Guestbook.sol`);
  const artifact = loadArtifact("Guestbook");

  const deployHash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
  });
  console.log(`  Deploy tx hash: ${deployHash}`);

  const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
  const contractAddress = deployReceipt.contractAddress!;
  console.log(`  Deployed at:    ${contractAddress}`);
  console.log(`  Gas used:       ${deployReceipt.gasUsed}`);
  console.log(`  In block:       #${deployReceipt.blockNumber}`);

  // ============================================================
  // Step 3: 发送交易调用 sign(...)
  // ============================================================
  const GUESTBOOK_ABI = parseAbi([
    "function sign(string message) external",
    "function messageOf(address who) external view returns (string message, uint256 updatedAt)",
    "function totalSigners() external view returns (uint256)",
    "function hasSigned(address who) external view returns (bool)",
    "event MessageSigned(address indexed signer, string message, uint256 timestamp, bool firstTime)",
  ]);

  const guestbook = getContract({
    address: contractAddress,
    abi: GUESTBOOK_ABI,
    client: { public: publicClient, wallet: walletClient },
  });

  const myMessage = `Hello from student-2231 at block ${blockNumber}!`;
  console.log(`\n[Step 3] Call sign("${myMessage}")`);
  const signHash = await guestbook.write.sign([myMessage]);
  console.log(`  Sign tx hash:   ${signHash}`);
  const signReceipt = await publicClient.waitForTransactionReceipt({ hash: signHash });
  console.log(`  Gas used:       ${signReceipt.gasUsed}`);
  console.log(`  In block:       #${signReceipt.blockNumber}`);
  console.log(`  Emitted logs:   ${signReceipt.logs.length}`);

  // ============================================================
  // Step 4: 读取状态
  // ============================================================
  console.log(`\n[Step 4] Read state back from chain`);
  const [storedMessage, updatedAt] = await guestbook.read.messageOf([account.address]);
  const totalSigners = await guestbook.read.totalSigners();
  const hasSigned = await guestbook.read.hasSigned([account.address]);

  console.log(`  messageOf(me):  "${storedMessage}"`);
  console.log(`  updatedAt:       ${updatedAt}  (unix)`);
  console.log(`  totalSigners:    ${totalSigners}`);
  console.log(`  hasSigned(me):   ${hasSigned}`);

  if (storedMessage !== myMessage) {
    throw new Error("✗ On-chain message does not match what we sent!");
  }
  if (totalSigners !== 1n) {
    throw new Error(`✗ Expected totalSigners=1, got ${totalSigners}`);
  }
  if (!hasSigned) {
    throw new Error("✗ Expected hasSigned=true");
  }

  // ============================================================
  // Step 5: 再改一次, 验证 "更新" 语义
  // ============================================================
  console.log(`\n[Step 5] Update my message (state mutation #2)`);
  const updatedMessage = "Updated from student-2231";
  const updateHash = await guestbook.write.sign([updatedMessage]);
  await publicClient.waitForTransactionReceipt({ hash: updateHash });

  const [readBack] = await guestbook.read.messageOf([account.address]);
  const signersAfter = await guestbook.read.totalSigners();
  console.log(`  New message:    "${readBack}"`);
  console.log(`  totalSigners:   ${signersAfter}  (should still be 1)`);

  if (readBack !== updatedMessage || signersAfter !== 1n) {
    throw new Error("✗ Update semantics broken");
  }

  console.log("\n" + banner);
  console.log("✓ All Homework 4 requirements satisfied:");
  console.log("  - Connected to Polkadot Hub TestNet via viem");
  console.log("  - Queried chainId / block / balance");
  console.log("  - Deployed Guestbook.sol");
  console.log("  - Sent sign(...) tx, twice (first insert, then update)");
  console.log("  - Read state back and validated consistency");
  console.log(banner);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
