// SPDX-License-Identifier: MIT
pragma solidity =0.5.16;
// contracts/uniswap/UniswapV2Factory.sol

import './UniswapV2Pair.sol';

// ================================================================
// Uniswap V2 Factory - 交易对工厂
//
// 核心职责：
// 1. 创建新的交易对合约（CREATE2 方式，地址可预测）
// 2. 维护所有交易对的注册表
// 3. 管理手续费接收者
//
// 为什么用 CREATE2？
// CREATE2 使用 keccak256(0xFF, deployer, salt, keccak256(bytecode))
// 计算合约地址，这意味着任何人都可以在部署前预测合约地址！
// UniswapV2Library.pairFor() 就利用了这个特性。
// ================================================================


contract UniswapV2Factory {
    address public feeTo;        // 手续费接收地址（0.05% 协议费）
    address public feeToSetter;  // 有权修改 feeTo 的管理员

    // tokenA => tokenB => pairAddress
    // 存储所有已创建的交易对地址
    mapping(address => mapping(address => address)) public getPair;

    // 所有交易对地址的数组
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    constructor(address _feeToSetter) public {
        feeToSetter = _feeToSetter;
    }

    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }

    // ========================================================
    // 🌟 核心函数：创建交易对
    //
    // 使用 CREATE2 部署 UniswapV2Pair 合约
    // salt = keccak256(abi.encodePacked(token0, token1))
    //
    // CREATE2 地址计算公式：
    // address = keccak256(0xFF + factory + salt + keccak256(bytecode))[12:]
    //                                              ↑
    //                                     这就是 INIT_CODE_HASH！
    // ========================================================
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, 'UniswapV2: IDENTICAL_ADDRESSES');

        // 确保 token0 < token1（按地址排序，保证唯一性）
        (address token0, address token1) = tokenA < tokenB 
            ? (tokenA, tokenB) 
            : (tokenB, tokenA);

        require(token0 != address(0), 'UniswapV2: ZERO_ADDRESS');
        require(getPair[token0][token1] == address(0), 'UniswapV2: PAIR_EXISTS');

        // 获取 UniswapV2Pair 的 bytecode（创建码）
        bytes memory bytecode = type(UniswapV2Pair).creationCode;

        // salt = 两个 token 地址的哈希
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));

        // 🔑 使用 CREATE2 部署
        // 这使得合约地址在部署前就可以被预测
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        // 初始化 pair 合约（设置两个 token 地址）
        IUniswapV2Pair(pair).initialize(token0, token1);

        // 双向注册（A→B 和 B→A 都指向同一个 pair）
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, 'UniswapV2: FORBIDDEN');
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, 'UniswapV2: FORBIDDEN');
        feeToSetter = _feeToSetter;
    }
}

// 在同一文件里声明接口，避免循环引用问题
interface IUniswapV2Pair {
    function initialize(address, address) external;
}