// contracts/interop/EVMCaller.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ================================================================
// PVM → EVM 互操作演示
//
// 这个合约展示两个场景：
// 1. 可被 Substrate extrinsic 调用的 EVM 合约
// 2. 通过 XCM 预编译从 Solidity 发起跨链消息
//
// 场景说明：
// - pallet-evm::call extrinsic 可以从 Substrate 侧直接调用 EVM 合约函数
// - 调用时 msg.sender 是从 Substrate 账户 ID 推导出的 EVM 地址
// ================================================================

// XCM 预编译接口（Moonbeam 上的 XCM 预编译）
interface XCM {
    // 发送 XCM 消息到其他平行链
    // @custom:address 0x0000000000000000000000000000000000000804
    function transferMultiasset(
        address asset,
        uint256 amount,
        bytes memory dest
    ) external returns (bool);
}

contract EVMCaller {
    // 记录所有被调用的历史
    struct CallRecord {
        address caller;       // 调用者地址（如果是 Substrate 账户，会被映射）
        string  action;       // 执行的操作
        uint256 value;        // 传入的数值
        uint256 timestamp;    // 时间戳
        bytes   extraData;    // 额外数据
    }

    CallRecord[] public callHistory;
    uint256 public totalCalls;

    // XCM 预编译地址
    address constant XCM_PRECOMPILE = 0x0000000000000000000000000000000000000804;

    event CalledFromSubstrate(
        address indexed caller,
        string action,
        uint256 value,
        uint256 timestamp
    );

    event XCMSent(
        address indexed from,
        address indexed asset,
        uint256 amount,
        bytes destination
    );

    // ============================================================
    // 函数1：这个函数可以被 Substrate 的 pallet-evm::call 触发
    //
    // 在 Substrate 侧，使用以下 extrinsic 调用它：
    // pallet_evm::call {
    //   source: <你的Substrate账户的EVM映射地址>,
    //   target: <本合约地址>,
    //   input: <encodeABI("recordSubstrateCall", ["hello from substrate!", 42])>,
    //   value: 0,
    //   gas_limit: 100000,
    //   max_fee_per_gas: <当前 gas price>,
    //   ...
    // }
    // ============================================================
    function recordSubstrateCall(
        string calldata action,
        uint256 value
    ) external {
        CallRecord memory record = CallRecord({
            caller:    msg.sender,
            action:    action,
            value:     value,
            timestamp: block.timestamp,
            extraData: ""
        });
        callHistory.push(record);
        totalCalls++;

        emit CalledFromSubstrate(msg.sender, action, value, block.timestamp);
    }

    // ============================================================
    // 函数2：一个可以接受任意字节数据的通用入口点
    // Substrate 侧可以通过编码任意数据来传递复杂指令
    // ============================================================
    function processSubstrateMessage(bytes calldata data) external payable {
        // 解码前 4 字节作为"操作类型"
        if (data.length >= 4) {
            // bytes4 opCode = bytes4(data[:4]);

            CallRecord memory record = CallRecord({
                caller:    msg.sender,
                action:    "substrate_message",
                value:     msg.value,
                timestamp: block.timestamp,
                extraData: data
            });
            callHistory.push(record);
            totalCalls++;

            emit CalledFromSubstrate(msg.sender, "substrate_message", msg.value, block.timestamp);
        }
    }

    // ============================================================
    // 函数3：查询调用历史
    // ============================================================
    function getCallHistory(uint256 index) external view returns (
        address caller,
        string memory action,
        uint256 value,
        uint256 timestamp
    ) {
        require(index < callHistory.length, "Index out of bounds");
        CallRecord memory record = callHistory[index];
        return (record.caller, record.action, record.value, record.timestamp);
    }

    function getCallCount() external view returns (uint256) {
        return totalCalls;
    }

    // ============================================================
    // 函数4：Substrate 账户映射说明
    //
    // 当 Substrate 账户调用 EVM 合约时，
    // 它的地址会被映射为：
    // EVM_address = last20bytes(keccak256(b"evm:" + substrate_account_id_32bytes))
    //
    // 这个函数帮助计算映射地址（链下验证用）
    // ============================================================
    function calculateSubstrateMapping(bytes32 substrateAccountId)
        external pure returns (address)
    {
        return address(uint160(uint256(
            keccak256(abi.encodePacked("evm:", substrateAccountId))
        )));
    }

    // ============================================================
    // 函数5：通过 XCM 预编译发送跨链消息
    // （这展示了 Solidity → XCM → 其他平行链 的路径）
    // ============================================================
    function sendXCMMessage(
        address asset,
        uint256 amount,
        bytes calldata destination
    ) external {
        // 在实际使用中，你需要先确保合约有足够的资产
        // 这里是演示概念
        XCM xcm = XCM(XCM_PRECOMPILE);

        // 注意：这需要合约持有相应资产，并且在支持 XCM 预编译的网络上
        // 在 Moonbase Alpha 测试时，请确认 XCM 预编译的确切接口
        bool success = xcm.transferMultiasset(asset, amount, destination);
        require(success, "XCM: transfer failed");

        emit XCMSent(msg.sender, asset, amount, destination);
    }

    // 允许合约接收原生代币
    receive() external payable {}
}