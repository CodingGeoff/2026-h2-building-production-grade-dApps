# Homework 6 - Student 1964 (bzd_111)

## 实践题答案

### 1. Uniswap V2 部署到测试网

#### 部署步骤

由于Uniswap V2官方已在Goerli测试网部署但该测试网已废弃，以下是部署到Sepolia测试网的步骤：

**使用的合约地址 (Sepolia Testnet):**
- WETH: `0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9`
- UniswapV2Router: `0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008` (社区部署)

**部署流程:**
1. 获取Sepolia ETH测试币
2. 部署WETH9合约
3. 部署UniswapV2Factory合约，设置feeToSetter为部署地址
4. 部署UniswapV2Router，传入factory和WETH地址
5. 调用factory.createPair创建交易对
6. 添加流动性

**测试用例:**
- 添加流动性测试 ✓
- 交换测试 ✓  
- 移除流动性测试 ✓

#### 修复的测试问题
- 修正了小数精度问题 (UQ112x112)
- 修正了滑点计算
- 修正了流动性代币余额计算

---

### 2. EVM 和 PVM 相互调用示例

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// EVM合约调用PVM
contract EVMCaller {
    // PVM预编译地址
    address constant PVM_PRECOMPILE = 0x0000000000000000000000000000000000000901;
    
    function callPVM(
        bytes calldata payload
    ) external returns (bytes memory) {
        (bool success, bytes memory result) = PVM_PRECOMPILE.call(payload);
        require(success, "PVM call failed");
        return result;
    }
    
    // EVM调用PVM合约的示例
    function callPVMContract(
        address pvmContract,
        string calldata method,
        bytes[] calldata args
    ) external returns (bytes memory) {
        bytes memory payload = abi.encode(pvmContract, method, args);
        return callPVM(payload);
    }
}

// PVM合约调用EVM
/*
PVM合约代码示例:
#[derive(Encode, Decode)]
struct CallEVM {
    address: AccountId,
    selector: [u8; 4],
    payload: Vec<u8>,
}

#[ink(message)]
pub fn call_evm(&self, call: CallEVM) -> Result<Vec<u8>, Error> {
    // 使用EVM预编译 0x0902
    let evm_precompile = AccountId::from_hex("0x0000000000000000000000000000000000000902")
        .unwrap();
    
    let mut input = vec![];
    input.extend_from_slice(&call.selector);
    input.extend_from_slice(&call.payload);
    
    self.ext().call(&evm_precompile, 0, &input)
}
*/
```

### 关键区别

| 特性 | EVM | PVM |
|------|-----|-----|
| 调用方式 | 同步 | 异步(通过消息队列) |
| Gas模型 | 单维 | 多维(ref_time, proof_size) |
| 预编译地址 | 0x00... | 0x09... |
| 重入保护 | 2300 gas stipend | 需手动实现 |

---

## 提交信息
- 学号: 1964
- 姓名: bzd_111  
- 完成时间: 2025-05