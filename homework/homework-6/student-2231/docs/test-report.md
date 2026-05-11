# 测试用例分析报告

> 学号：2231  
> 共 29 个测试用例，全部通过（用时 3 秒）

---

## 1. UniswapV2ERC20 (7 项)

LP Token 的 ERC20 + permit 语义测试。

| # | 测试名 | 验证点 |
| - | ---- | ---- |
| 1 | `name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH` | 基础元信息 + EIP-712 域分隔符 |
| 2 | `approve` | 触发 `Approval` 事件、`allowance` 更新 |
| 3 | `transfer` | 正常转账 + 事件 + 余额更新 |
| 4 | `transfer:fail` | 超额转账必须 revert、空账户转账必须 revert |
| 5 | `transferFrom` | 授权后代扣、allowance 归零 |
| 6 | `transferFrom:max` | `uint256.max` 授权不扣减 allowance（"无限授权"约定） |
| 7 | `permit` | 链下签名授权（EIP-2612），nonce 递增 |

**亮点**：`permit` 用 `Wallet.createRandom()` 创建离线签名账户，不需要给这个账户转测试币，体现了 permit 的核心价值——用户无需 ETH 即可授权。

---

## 2. UniswapV2Factory (5 项)

工厂合约的职责：创建 pair、管理手续费接收者。

| # | 测试名 | 验证点 |
| - | ---- | ---- |
| 1 | `feeTo, feeToSetter, allPairsLength` | 初始状态（feeTo = 0x0, 无 pair） |
| 2 | `createPair` | 正向创建 + 事件 + 重复创建 revert + pair 字段初始化正确 |
| 3 | `createPair:reverse` | 反向顺序（tokenB, tokenA）应产出同一 pair 地址 |
| 4 | `setFeeTo` | 非 feeToSetter 调用必须 revert |
| 5 | `setFeeToSetter` | 角色可转移，但转移后原角色即失去权限 |

**亮点**：测试里用 ethers 的 `getCreate2Address()` 先算出 pair 地址，再断言链上真实产出的 pair 地址与之相等：
```ts
const create2Address = getCreate2Address(
  await factory.getAddress(),
  salt,
  initCodeHash
);
await expect(factory.createPair(...)).to.emit(factory, 'PairCreated')
  .withArgs(token0, token1, create2Address, 1n);
```
这验证了 CREATE2 在 Polkadot EVM 路径下的行为与以太坊一致，是整个 Uniswap 生态在 Polkadot 能用的关键前提。

---

## 3. UniswapV2Pair (17 项)

### 3.1 基础：mint (1 项)

| # | 测试名 | 验证点 |
| - | ---- | ---- |
| 1 | `mint` | 首次添加流动性 = `sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY`，永久锁定 1000 枚 LP 给 0x0 |

### 3.2 价格公式：getInputPrice × 7

验证 swap 的恒定乘积公式：给定 `amountIn, reserve0, reserve1`，输出量必须 `≤ expected`，否则 `revert('UniswapV2: K')`。

| # | 测试 | swap | r0 | r1 | 预期输出 |
| - | ---- | ---- | ---- | ---- | ---- |
| 0 | 小额进大池 | 1e18 | 5e18 | 10e18 | 1.66e18 |
| 1 | 小额反向 | 1e18 | 10e18 | 5e18 | 0.45e18 |
| 2 | 中额进大池 | 2e18 | 5e18 | 10e18 | 2.85e18 |
| 3 | 中额反向 | 2e18 | 10e18 | 5e18 | 0.83e18 |
| 4 | 等价池 | 1e18 | 10e18 | 10e18 | 0.9066e18 |
| 5 | 大池 | 1e18 | 100e18 | 100e18 | 0.9871e18 |
| 6 | 超大池 | 1e18 | 1000e18 | 1000e18 | 0.9960e18 |

**观察**：池子越大，`amountOut / amountIn` 越接近 1（滑点越小）。测试故意让 `expectedOutputAmount + 1n` 触发 K 不变式 revert，再用精确值通过，验证精度边界。

### 3.3 乐观转账：optimistic × 4

测试 `swap` 的 "optimistic transfer + callback" 特性（闪电贷基础）：合约先转钱出去，最后才检查 K 是否守恒。

| # | 验证点 |
| - | ---- |
| 0 | 0.997e18 output, 1 wei input, r0=5 r1=10 — 刚好满足 K |
| 1 | 反向同上 |
| 2 | 等价池 |
| 3 | 输入 1e18 反向取巨量 token0 — 精确到 wei |

### 3.4 方向性 swap (2 项)

| # | 测试 | 验证点 |
| - | ---- | ---- |
| 1 | `swap:token0` | token0 → token1，事件顺序 Transfer/Sync/Swap，储备量精确更新 |
| 2 | `swap:token1` | 反向同上 |

### 3.5 burn (1 项)

退还流动性：LP 先转回给 pair，再调 `burn`。

- 3 LP Token → 退回 `token0Amount - 1000`（永久锁定的 1000 不可取）
- 8 个 event 按顺序：Transfer (burn LP) → Transfer (token0) → Transfer (token1) → Sync → Burn

### 3.6 feeTo (2 项)

协议费开关测试：

| # | 测试 | 验证点 |
| - | ---- | ---- |
| 1 | `feeTo:off` | swap + burn 后，totalSupply 回到 MINIMUM_LIQUIDITY，无协议费 |
| 2 | `feeTo:on` | 协议费地址获得 `249750499251388` LP Token（1/6 手续费），计算完全吻合论文公式 |

`feeTo:on` 的数值 `249750499251388` 是从 1000 规模的池子 + 1e18 swap + 1000 burn 全套流程推导出的确切值——这说明测试对手续费的精确度到 wei 级别。

---

## 4. 总结

| 维度 | 覆盖情况 |
| ---- | ---- |
| ERC20 语义 | ✅（含 permit） |
| 工厂创建 + 权限 | ✅ |
| AMM 恒定乘积 | ✅ 7 个价格点 + 边界 |
| swap 双向 | ✅ |
| 流动性增减 | ✅（mint / burn） |
| 闪电贷入口 | ✅（optimistic） |
| 协议费 | ✅（on/off） |
| CREATE2 地址一致性 | ✅（Polkadot EVM 路径关键验证） |

所有用例均在本地 hardhat 网络一次通过，无需任何修复——说明 Uniswap V2 核心代码在 Polkadot Hub 的 REVM 下可以零改动运行，这与官方教程的设计预期一致。
