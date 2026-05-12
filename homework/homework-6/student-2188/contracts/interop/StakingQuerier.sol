// contracts/interop/StakingQuerier.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ================================================================
// EVM → PVM 互操作演示
//
// 这个合约展示了如何从 Solidity 调用波卡原生的
// Parachain Staking Pallet（通过预编译合约实现）
//
// 适用网络：Moonbeam / Moonriver / Moonbase Alpha
// 预编译地址：0x0000000000000000000000000000000000000800
//
// 官方 Solidity 接口来源：
// https://github.com/moonbeam-foundation/moonbeam/blob/master
//   /precompiles/parachain-staking/StakingInterface.sol
// ================================================================

// ----------------------------------------------------------------
// 定义预编译合约的 Solidity 接口
// 这个接口与 Rust 侧的函数选择器（4字节签名）完全对应
// ----------------------------------------------------------------
interface ParachainStaking {
    // 查询某地址是否为质押委托者（delegator）
    // @custom:selector fd8ab482
    function isDelegator(address delegator) external view returns (bool);

    // 查询某地址是否为候选收集者（collator candidate）
    // @custom:selector d51b9e93
    function isCandidate(address candidate) external view returns (bool);

    // 查询某委托者的总质押量
    // @custom:selector e6861713
    function getDelegatorTotalStaked(address delegator) external view returns (uint256);

    // 查询某候选收集者的总质押量（包括所有委托）
    // @custom:selector bc5a1043
    function getCandidateTotalCounted(address candidate) external view returns (uint256);

    // 委托：向一个候选收集者质押代币
    // @custom:selector 829f5ee3
    function delegate(
        address candidate,
        uint256 amount,
        uint256 candidateDelegationCount,
        uint256 delegatorDelegationCount
    ) external;

    // 查询当前轮次（round）信息
    // @custom:selector 884cf7a4（注：不同版本可能不同）
    // function round() external view returns (uint256);  // 某些版本有
}

// ----------------------------------------------------------------
// 主合约：Staking 信息查询器
// ----------------------------------------------------------------
contract StakingQuerier {
    // ⭐ 预编译合约地址（Moonbeam/Moonbase Alpha 上固定不变）
    address public constant PRECOMPILE_ADDRESS =
        0x0000000000000000000000000000000000000800;

    // 创建预编译合约的接口实例
    ParachainStaking public immutable stakingPrecompile;

    // 事件：记录查询结果
    event StakingInfoQueried(
        address indexed queried,
        bool isDelegator,
        bool isCandidate,
        uint256 totalStaked,
        uint256 timestamp
    );

    // 存储最近一次查询结果（方便外部读取）
    struct QueryResult {
        address target;
        bool isDelegator;
        bool isCandidate;
        uint256 delegatorTotalStaked;
        uint256 candidateTotalCounted;
        uint256 queriedAt;
    }
    QueryResult public lastQueryResult;

    constructor() {
        // 将预编译地址包装成 Solidity 接口
        stakingPrecompile = ParachainStaking(PRECOMPILE_ADDRESS);
    }

    // ============================================================
    // 查询函数1：检查某地址的完整质押状态
    // ============================================================
    function queryStakingInfo(address target)
        external
        returns (QueryResult memory result)
    {
        // 直接调用预编译合约（就像调用普通合约一样！）
        // 这些调用会穿越 EVM/Substrate 边界，执行 Rust 代码
        result.target               = target;
        result.isDelegator          = stakingPrecompile.isDelegator(target);
        result.isCandidate          = stakingPrecompile.isCandidate(target);
        result.delegatorTotalStaked = stakingPrecompile.getDelegatorTotalStaked(target);
        result.candidateTotalCounted = stakingPrecompile.getCandidateTotalCounted(target);
        result.queriedAt            = block.timestamp;

        // 保存结果
        lastQueryResult = result;

        // 发出事件
        emit StakingInfoQueried(
            target,
            result.isDelegator,
            result.isCandidate,
            result.delegatorTotalStaked,
            block.timestamp
        );

        return result;
    }

    // ============================================================
    // 查询函数2：纯查询（不存储，节省 gas）
    // ============================================================
    function checkIsDelegator(address target) external view returns (bool) {
        return stakingPrecompile.isDelegator(target);
    }

    function checkIsCandidate(address target) external view returns (bool) {
        return stakingPrecompile.isCandidate(target);
    }

    function getDelegatorStake(address delegator) external view returns (uint256) {
        return stakingPrecompile.getDelegatorTotalStaked(delegator);
    }

    function getCandidateTotalStake(address candidate) external view returns (uint256) {
        return stakingPrecompile.getCandidateTotalCounted(candidate);
    }

    // ============================================================
    // 批量查询（一次 tx 查多个地址）
    // ============================================================
    function batchQueryDelegators(address[] calldata addresses)
        external
        view
        returns (bool[] memory results)
    {
        results = new bool[](addresses.length);
        for (uint256 i = 0; i < addresses.length; i++) {
            results[i] = stakingPrecompile.isDelegator(addresses[i]);
        }
        return results;
    }

    // ============================================================
    // 验证预编译合约是否可以正常调用
    // 用于诊断：如果这个函数 revert，说明网络不支持该预编译
    // ============================================================
    function verifyPrecompileWorks() external view returns (bool) {
        // 尝试查询零地址（应该返回 false，不会 revert）
        try stakingPrecompile.isDelegator(address(0)) returns (bool) {
            return true;
        } catch {
            return false;
        }
    }

    // 获取预编译地址（方便前端使用）
    function getPrecompileAddress() external pure returns (address) {
        return PRECOMPILE_ADDRESS;
    }
}