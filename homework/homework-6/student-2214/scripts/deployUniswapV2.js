// scripts/deployUniswapV2.js
const hre = require("hardhat");
const { getAddress, isAddress } = require("ethers");

const DEFAULT_WETH_BY_NETWORK = {
  polkadotTestnet: "0x5e6031572A58f02cd73b3bB5523365D77D1Bb1F4",
};

/**
 * 从命令行参数里读取指定选项，支持 --name value 和 --name=value 两种写法。
 * 注意：在 hardhat run 下更推荐用环境变量传网络地址，避免被 Hardhat 自己的参数解析截走。
 */
function readArgValue(names, argv = process.argv.slice(2)) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const matchedName = names.find((name) => arg === name || arg.startsWith(`${name}=`));
    if (!matchedName) continue;

    if (arg.includes("=")) {
      return arg.slice(arg.indexOf("=") + 1);
    }

    return argv[index + 1];
  }

  return undefined;
}

/**
 * 校验并规范化地址参数。
 * 返回 ethers 校验后的 checksum 地址，调用方拿到后可以直接用于部署构造参数。
 */
function resolveAddressOption(value, optionName) {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new Error(`${optionName} is required`);
  }

  if (!isAddress(normalized)) {
    throw new Error(`${optionName} must be a valid address`);
  }

  return getAddress(normalized);
}

/**
 * 解析 Router 构造函数需要的 WETH 地址。
 * 注意：只给已确认的网络放默认值，其他网络必须显式传入，避免把测试网地址误用到别的链。
 */
function resolveWethAddress(value, networkName) {
  const fallbackAddress = DEFAULT_WETH_BY_NETWORK[networkName];
  return resolveAddressOption(value || fallbackAddress, "WETH_ADDRESS");
}

/**
 * 部署 UniswapV2 Factory 和 Router02。
 * 注意：Router 必须拿到本次部署出来的 Factory 地址；WETH 优先用调用方传入值，已确认网络才允许用默认值。
 */
async function deployUniswapV2(options = {}) {
  const runtime = options.hre || hre;
  const silent = Boolean(options.silent);
  const log = (...args) => {
    if (!silent) console.log(...args);
  };

  const [deployer] = await runtime.ethers.getSigners();
  const deployerAddress = deployer.address;
  const networkName = options.networkName || runtime.network.name;
  const wethAddress = resolveWethAddress(options.wethAddress, networkName);
  const feeToSetter = resolveAddressOption(
    options.feeToSetter || deployerAddress,
    "FEE_TO_SETTER"
  );

  log("Deploying UniswapV2 with the account:", deployerAddress);
  log("Network:", networkName);
  log("WETH address:", wethAddress);
  log("FeeToSetter address:", feeToSetter);

  // Router 依赖 Factory 地址，所以这里必须先部署 Factory，再把新地址传给 Router。
  const UniswapV2Factory = await runtime.ethers.getContractFactory("UniswapV2Factory");
  const factory = await UniswapV2Factory.deploy(feeToSetter);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  log("UniswapV2Factory deployed to:", factoryAddress);

  // WETH 是各网络已有的封装原生币合约，只给确认过的网络使用默认值，其他网络继续要求显式传入。
  const UniswapV2Router02 = await runtime.ethers.getContractFactory("UniswapV2Router02");
  const router = await UniswapV2Router02.deploy(factoryAddress, wethAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  log("UniswapV2Router02 deployed to:", routerAddress);

  return {
    deployerAddress,
    feeToSetter,
    wethAddress,
    factory,
    factoryAddress,
    router,
    routerAddress,
  };
}

async function main() {
  const wethAddress =
    readArgValue(["--weth", "--weth-address"]) || process.env.WETH_ADDRESS;
  const feeToSetter =
    readArgValue(["--fee-to-setter", "--fee-to-setter-address"]) ||
    process.env.FEE_TO_SETTER;

  const deployment = await deployUniswapV2({
    hre,
    wethAddress,
    feeToSetter,
  });

  console.log("Deployment completed.");
  console.log("Factory address:", deployment.factoryAddress);
  console.log("Router02 address:", deployment.routerAddress);
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
  DEFAULT_WETH_BY_NETWORK,
  deployUniswapV2,
  readArgValue,
  resolveAddressOption,
  resolveWethAddress,
};
