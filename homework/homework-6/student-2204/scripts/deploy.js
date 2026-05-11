const hre = require("hardhat");

async function main() {
  console.log("Deploying UniswapV2...");

  // 修复 1：必须用 hre.ethers
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy Test Tokens
  console.log("\n1. Deploying test tokens...");
  const TokenFactory = await hre.ethers.getContractFactory("TestToken");
  const tokenA = await TokenFactory.deploy(hre.ethers.parseEther("1000000"));
  await tokenA.waitForDeployment();
  console.log("Token A deployed to:", tokenA.target);

  const tokenB = await TokenFactory.deploy(hre.ethers.parseEther("1000000"));
  await tokenB.waitForDeployment();
  console.log("Token B deployed to:", tokenB.target);

  // Deploy Factory
  console.log("\n2. Deploying UniswapV2Factory...");
  const FactoryFactory = await hre.ethers.getContractFactory("UniswapV2Factory");
  const factory = await FactoryFactory.deploy(deployer.address);
  await factory.waitForDeployment();
  console.log("Factory deployed to:", factory.target);

  // Deploy Router
  console.log("\n3. Deploying UniswapV2Router...");
  const RouterFactory = await hre.ethers.getContractFactory("UniswapV2Router");
  const router = await RouterFactory.deploy(factory.target, hre.ethers.ZeroAddress);
  await router.waitForDeployment();
  console.log("Router deployed to:", router.target);

  // Create Pair
  console.log("\n4. Creating pair...");
  const tx = await factory.createPair(tokenA.target, tokenB.target);
  await tx.wait();
  const pairAddr = await factory.getPair(tokenA.target, tokenB.target);
  console.log("Pair created at:", pairAddr);

  // Add initial liquidity
  console.log("\n5. Adding initial liquidity...");
  const amountA = hre.ethers.parseEther("10000");
  const amountB = hre.ethers.parseEther("10000");

  await tokenA.approve(router.target, amountA);
  await tokenB.approve(router.target, amountB);

  const deadline = (await hre.ethers.provider.getBlock("latest")).timestamp + 3600;
  const addTx = await router.addLiquidity(
    tokenA.target,
    tokenB.target,
    amountA,
    amountB,
    0,
    0,
    deployer.address,
    deadline
  );
  await addTx.wait();
  console.log("Liquidity added successfully");

  // Print deployment summary
  console.log("\n========== Deployment Summary ==========");
  console.log("Token A:", tokenA.target);
  console.log("Token B:", tokenB.target);
  console.log("Factory:", factory.target);
  console.log("Router:", router.target);
  console.log("Pair:", pairAddr);
  console.log("=========================================\n");

  // Save addresses
  const addresses = {
    tokenA: tokenA.target,
    tokenB: tokenB.target,
    factory: factory.target,
    router: router.target,
    pair: pairAddr
  };

  const fs = require("fs");
  fs.writeFileSync(
    "deployment-addresses.json",
    JSON.stringify(addresses, null, 2)
  );
  console.log("Addresses saved to deployment-addresses.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });