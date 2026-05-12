// scripts/deployUsdcUsdtPool.js
const hre = require("hardhat");
const { parseUnits } = require("ethers");

const {
  readArgValue,
  resolveAddressOption,
} = require("./deployUniswapV2");

const TOKEN_DECIMALS = 18;
const DEFAULT_POOL_AMOUNT = "1000";

const DEFAULT_ROUTER_BY_NETWORK = {
  polkadotTestnet: "0x20ca51Dfe650f42e47F6C362080B74e3f6A8eC75",
};

function parseTokenAmount(value = DEFAULT_POOL_AMOUNT) {
  const normalized = String(value).trim();
  if (!normalized) {
    throw new Error("TOKEN_AMOUNT is required");
  }

  return parseUnits(normalized, TOKEN_DECIMALS);
}

function resolveRouterAddress(value, networkName) {
  const fallbackAddress = DEFAULT_ROUTER_BY_NETWORK[networkName];
  return resolveAddressOption(value || fallbackAddress, "ROUTER_ADDRESS");
}

async function latestDeadline(runtime) {
  const block = await runtime.ethers.provider.getBlock("latest");
  return BigInt(block.timestamp + 3600);
}

async function ensureBalance(token, ownerAddress, amount, label, log) {
  const balance = await token.balanceOf(ownerAddress);
  if (balance >= amount) return;

  // USDC/USDT 当前测试合约都支持 owner mint；只补差额，避免重复运行脚本时多铸不必要的币。
  const missing = amount - balance;
  log(`Minting missing ${label}:`, missing.toString());
  const tx = await token.mint(missing);
  await tx.wait();
}

async function approveIfNeeded(token, ownerAddress, spenderAddress, amount, label, log) {
  const allowance = await token.allowance(ownerAddress, spenderAddress);
  if (allowance >= amount) return;

  // Router 需要 allowance 才能把代币转入 Pair，这里只授权本次加池所需数量。
  log(`Approving ${label} for Router:`, amount.toString());
  const tx = await token.approve(spenderAddress, amount);
  await tx.wait();
}

/**
 * 部署 USDC/USDT，并通过 UniswapV2Router02 创建 USDC-USDT 池子。
 * 注意：默认数量按 18 位精度解析，初始池子价格由 usdcAmount/usdtAmount 的比例决定。
 */
async function deployUsdcUsdtPool(options = {}) {
  const runtime = options.hre || hre;
  const silent = Boolean(options.silent);
  const log = (...args) => {
    if (!silent) console.log(...args);
  };

  const [deployer] = await runtime.ethers.getSigners();
  const deployerAddress = deployer.address;
  const networkName = options.networkName || runtime.network.name;
  const routerAddress = resolveRouterAddress(options.routerAddress, networkName);
  const usdcAmount = parseTokenAmount(options.usdcAmount || DEFAULT_POOL_AMOUNT);
  const usdtAmount = parseTokenAmount(options.usdtAmount || DEFAULT_POOL_AMOUNT);

  log("Deploying USDC/USDT with the account:", deployerAddress);
  log("Network:", networkName);
  log("Router address:", routerAddress);
  log("USDC liquidity amount:", usdcAmount.toString());
  log("USDT liquidity amount:", usdtAmount.toString());

  const router = await runtime.ethers.getContractAt("UniswapV2Router02", routerAddress);
  const factoryAddress = await router.factory();
  const factory = await runtime.ethers.getContractAt("UniswapV2Factory", factoryAddress);
  log("Factory address:", factoryAddress);

  const Usdc = await runtime.ethers.getContractFactory("BEP20TokenImplementation");
  const usdc = await Usdc.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  log("USDC deployed to:", usdcAddress);

  // USDC 合约是可初始化实现合约，部署后必须先设置名称、符号、精度、初始供应量和 owner。
  const initializeTx = await usdc.initialize(
    "USD Coin",
    "USDC",
    TOKEN_DECIMALS,
    usdcAmount,
    true,
    deployerAddress
  );
  await initializeTx.wait();
  log("USDC initialized.");

  const Usdt = await runtime.ethers.getContractFactory("USDT");
  const usdt = await Usdt.deploy();
  await usdt.waitForDeployment();
  const usdtAddress = await usdt.getAddress();
  log("USDT deployed to:", usdtAddress);

  await ensureBalance(usdc, deployerAddress, usdcAmount, "USDC", log);
  await ensureBalance(usdt, deployerAddress, usdtAmount, "USDT", log);
  await approveIfNeeded(usdc, deployerAddress, routerAddress, usdcAmount, "USDC", log);
  await approveIfNeeded(usdt, deployerAddress, routerAddress, usdtAmount, "USDT", log);

  // 新部署的两枚代币还没有 Pair，Router.addLiquidity 会先通过 Factory 创建池子。
  const addLiquidityTx = await router.addLiquidity(
    usdcAddress,
    usdtAddress,
    usdcAmount,
    usdtAmount,
    usdcAmount,
    usdtAmount,
    deployerAddress,
    await latestDeadline(runtime)
  );
  await addLiquidityTx.wait();

  const pairAddress = await factory.getPair(usdcAddress, usdtAddress);
  const pair = await runtime.ethers.getContractAt("UniswapV2Pair", pairAddress);
  const lpBalance = await pair.balanceOf(deployerAddress);

  log("USDC-USDT pair address:", pairAddress);
  log("LP balance:", lpBalance.toString());

  return {
    deployerAddress,
    factory,
    factoryAddress,
    lpBalance,
    pair,
    pairAddress,
    router,
    routerAddress,
    usdc,
    usdcAddress,
    usdcAmount,
    usdt,
    usdtAddress,
    usdtAmount,
  };
}

async function main() {
  const deployment = await deployUsdcUsdtPool({
    hre,
    routerAddress: readArgValue(["--router", "--router-address"]) || process.env.UNISWAP_V2_ROUTER_ADDRESS,
    usdcAmount: readArgValue(["--usdc-amount"]) || process.env.USDC_POOL_AMOUNT,
    usdtAmount: readArgValue(["--usdt-amount"]) || process.env.USDT_POOL_AMOUNT,
  });

  console.log("Deployment completed.");
  console.log("USDC address:", deployment.usdcAddress);
  console.log("USDT address:", deployment.usdtAddress);
  console.log("USDC-USDT pair address:", deployment.pairAddress);
  console.log("LP balance:", deployment.lpBalance.toString());
}

if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  DEFAULT_POOL_AMOUNT,
  DEFAULT_ROUTER_BY_NETWORK,
  TOKEN_DECIMALS,
  deployUsdcUsdtPool,
  parseTokenAmount,
  resolveRouterAddress,
};
