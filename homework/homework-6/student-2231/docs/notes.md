# Uniswap V2 与 Polkadot EVM 学习笔记

> 学号：2231  
> 作业：Homework 6 · Task 1

本篇是我在完成作业过程中的学习笔记，覆盖 Polkadot EVM 路径、Uniswap V2 架构、以及关键知识点。

---

## 1. Polkadot Hub 的双 VM 栈

Polkadot Hub 同时支持两条执行路径：

| 路径 | 说明 | 适用场景 |
| ---- | ---- | ---- |
| **PVM** | 用 `revive` 编译器把 Solidity 编译成 PolkaVM 字节码 | 想利用 PolkaVM 的性能、与 Substrate 深度整合 |
| **EVM** | 由 [REVM](https://github.com/bluealloy/revm)（Rust 实现的以太坊虚拟机）直接执行 **未修改** 的 EVM 字节码 | 想一比一复用以太坊上的 Solidity 项目 |

本次作业走 **EVM 路径**：因为 Uniswap V2 原版是 Solidity 0.5.16，且依赖 `keccak256(bytecode)` 计算的 create2 地址（对字节码极度敏感），用 REVM 可以零改动运行。

---

## 2. Uniswap V2 核心架构

### 2.1 Factory
```solidity
mapping(address => mapping(address => address)) public getPair;
address[] public allPairs;

function createPair(address tokenA, address tokenB) external returns (address pair) {
    // 1. 排序 token
    (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    // 2. 用 CREATE2 部署 Pair
    bytes memory bytecode = type(UniswapV2Pair).creationCode;
    bytes32 salt = keccak256(abi.encodePacked(token0, token1));
    assembly {
        pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
    }
    IUniswapV2Pair(pair).initialize(token0, token1);
    // ...
}
```

**为什么用 CREATE2？** 地址公式 `keccak256(0xFF, factory, salt, keccak256(bytecode))` 决定——只要 Factory 地址、两个 token 地址、Pair bytecode 确定，就可以 **在部署前算出未来的 pair 地址**。Router 合约因此不需要读链上状态就能定位 pair，非常省 gas。

### 2.2 Pair：AMM 核心

三个最重要的函数：

- **`mint(address to)`**：添加流动性。根据新加入的 token 数量与当前储备比例，mint LP Token 给用户。第一次添加时，会永久锁定 `MINIMUM_LIQUIDITY = 1000` 枚 LP Token 给 `address(0)`，防止除以 0 攻击。
- **`burn(address to)`**：撤回流动性。按 LP Token 占总供应的比例，退还 token0 / token1 给用户。
- **`swap(uint amount0Out, uint amount1Out, address to, bytes data)`**：核心交易逻辑。关键不变式：
  ```
  balance0Adjusted * balance1Adjusted >= reserve0 * reserve1 * 1000 * 1000
  ```
  其中 `balanceAdjusted = balance * 1000 - amountIn * 3`，即 0.3% 手续费已扣除。
  这一行 `require(... >= ...)` 保证了恒定乘积 `x * y = k` 不会被破坏。

### 2.3 LP Token（UniswapV2ERC20）
继承标准 ERC20，同时实现了 **EIP-2612 permit**：允许用户通过链下签名授权，无需发送 approve 交易。`DOMAIN_SEPARATOR` 绑定了 chainId 和合约地址，防止跨链重放。

### 2.4 手续费分配
- 协议费（1/6 的 swap 手续费）默认关闭。
- 开启后，通过 `_mintFee` 在每次 `mint` / `burn` 前铸造新 LP Token 给 `feeTo` 地址，相当于稀释其他 LP。
- 实现巧妙：不直接收取手续费，而是通过 mint 新 LP 来"稀释获得"，避免每次 swap 都要额外存储更新。

---

## 3. 我在这次作业中理解的关键点

### 3.1 关于 `uint(-1)` 的"无限授权"
UniswapV2ERC20 的 `transferFrom` 里：
```solidity
if (allowance[from][msg.sender] != uint(-1)) {
    allowance[from][msg.sender] = allowance[from][msg.sender].sub(value);
}
```
当授权额度是 `uint256.max`（即 `uint(-1)`）时，跳过扣减。这是一种约定：最大值代表"无限授权"，避免反复 approve。

### 3.2 K 不变式的数值验证
测试里有一组 `getInputPrice:0-6` 用例，比如：
```
swapAmount=1, reserve0=5, reserve1=10 → expectedOutput = 1662497915624478906
```
这个 1662 开头的数字是怎么来的？
```
amountInWithFee = 1e18 * 997 = 997e18
numerator = 997e18 * 10e18
denominator = 5e18 * 1000 + 997e18 = 5997e18
amountOut = numerator / denominator ≈ 1.6624979e18
```
测试会故意尝试多拿 1 wei（`expectedOutputAmount + 1n`），预期 `revert('UniswapV2: K')`——这正是恒定乘积守恒的边界测试。

### 3.3 CREATE2 地址在测试里的用法
`UniswapV2Factory.test.ts` 里用 ethers.js 的 `getCreate2Address` 预先算出 pair 地址，然后断言 `factory.createPair` 事件里的 pair 地址等于它：
```ts
const bytecode = UniswapV2Pair.bytecode;
const initCodeHash = keccak256(bytecode);
const salt = keccak256(solidityPacked(["address", "address"], [token0, token1]));
const create2Address = getCreate2Address(factory.address, salt, initCodeHash);
```
**如果链上实际部署的 Pair bytecode 和本地编译的不一致（比如优化器设置不同），`initCodeHash` 就会不一样，Router 合约就会算错 pair 地址**。这也是为什么官方强调 EVM 路径跑 Uniswap 会直接可用——REVM 执行原版字节码，bytecode 哈希和以太坊上完全一致。

---

## 4. EVM vs PVM 的权衡

通过本次作业，我对二者的差别有了更直观的认识：

| 维度 | EVM 路径 | PVM 路径 |
| ---- | ---- | ---- |
| 工具链 | 标准 Hardhat / Foundry / Remix | 需要 revive 插件或 Polkadot Remix |
| 合约改动 | 零改动 | 部分指令不支持，需改写 |
| 性能 | 与主流 L2 接近 | 更高（尤其大合约、递归调用） |
| create2 精确性 | `keccak256(bytecode)` 与主网一致 | 字节码经过 revive 重编译，initHash 不一致 |

结论：**想跑 Uniswap V2 / V3 这类依赖 create2 预测地址的 DApp，EVM 路径是首选。**

---

## 5. 本次作业我动手做的事

1. 参照官方教程搭建项目结构
2. 本地安装依赖（`npm install`，含 593 个包）
3. 下载编译器 0.5.16 并编译 12 个 Solidity 文件
4. 完整跑通 29 个测试用例
5. 用 `scripts/deploy.ts` 部署 Factory + 2 个 ERC20 + 1 个 Pair 到本地 hardhat network
6. 写本篇笔记和 [`deployment.md`](./deployment.md) / [`test-report.md`](./test-report.md)

具体命令、时间、输出见 [`deployment.md`](./deployment.md)。

---

## 6. 参考资料

- [Polkadot Cookbook - Deploy Uniswap V2 Core with EVM](https://docs.polkadot.com/smart-contracts/cookbook/eth-dapps/uniswap-v2/core-v2/)
- [Polkadot EVM vs PVM](https://docs.polkadot.com/smart-contracts/for-eth-devs/evm-vs-pvm/)
- [Uniswap V2 原始论文 / 文档](https://docs.uniswap.org/contracts/v2/overview)
- [EIP-2612 permit](https://eips.ethereum.org/EIPS/eip-2612)
- [REVM Rust 实现](https://github.com/bluealloy/revm)
