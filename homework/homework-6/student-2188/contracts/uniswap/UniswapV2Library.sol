// contracts/uniswap/UniswapV2Library.sol
// SPDX-License-Identifier: MIT

pragma solidity =0.6.6;

// ================================================================
// UniswapV2Library - 路由器的辅助库
//
// ⚠️ 最重要的函数：pairFor()
//
// pairFor() 使用 CREATE2 公式"预测"pair 合约地址：
// address = keccak256(
//   0xFF + factory + salt + INIT_CODE_HASH
// )[last 20 bytes]
//
// 其中：
// - factory = UniswapV2Factory 地址
// - salt = keccak256(token0, token1)
// - INIT_CODE_HASH = keccak256(UniswapV2Pair 的 creationCode)
//
// 🔑 INIT_CODE_HASH 必须与实际部署的 Pair 合约 bytecode hash 完全一致！
// 否则 pairFor() 会计算出错误地址，导致所有 Router 调用失败！
//
// !! 注意：下面的 INIT_CODE_HASH 是占位符 !!
// !! 你需要运行部署脚本后，用真实值替换它 !!
// ================================================================

library UniswapV2Library {

    // ❌ 错误示例（以太坊主网的哈希，在你自己部署时无效）：
    // bytes32 internal constant PAIR_CODE_HASH =
    //     hex'96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f';
    //
    // ✅ 正确做法：部署脚本会计算真实值，然后我们把它填进来
    //
    // 临时占位符（会被部署脚本替换）：
    bytes32 internal constant PAIR_CODE_HASH =
        hex'101967b6266ec8f92c32ee026e840a2d21047973f29902202512783a8d4fd8d2';
    // ^^^^^^^ 这个值需要在部署后替换！^^^^^^^

    // 将两个 token 地址排序（小的在前）
    // 这确保无论传入顺序如何，(A,B) 和 (B,A) 都指向同一个 pair
    function sortTokens(address tokenA, address tokenB)
        internal pure returns (address token0, address token1)
    {
        require(tokenA != tokenB, 'UniswapV2Library: IDENTICAL_ADDRESSES');
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'UniswapV2Library: ZERO_ADDRESS');
    }

    // ========================================================
    // ⭐ 核心函数：不查链，直接通过 CREATE2 公式计算 pair 地址
    // 这是 Router 高效的原因——无需 SLOAD（节省 gas）
    // ========================================================
    function pairFor(address factory, address tokenA, address tokenB)
        internal pure returns (address pair)
    {
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        pair = address(uint(keccak256(abi.encodePacked(
            hex'ff',           // CREATE2 前缀
            factory,           // 部署者（Factory 合约）
            keccak256(abi.encodePacked(token0, token1)),  // salt
            PAIR_CODE_HASH     // ← 必须与实际部署的 bytecode hash 一致！
        ))));
    }

    // 获取储备量
    function getReserves(address factory, address tokenA, address tokenB) internal view returns (uint reserveA, uint reserveB) {
        (address token0,) = sortTokens(tokenA, tokenB);
        // ⭐ 这里已经修复，使用了 IUniswapV2Pair_Library
        (uint reserve0, uint reserve1,) = IUniswapV2Pair_Library(pairFor(factory, tokenA, tokenB)).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    // 根据比例计算另一种代币的等值数量（添加流动性时用）
    function quote(uint amountA, uint reserveA, uint reserveB)
        internal pure returns (uint amountB)
    {
        require(amountA > 0, 'UniswapV2Library: INSUFFICIENT_AMOUNT');
        require(reserveA > 0 && reserveB > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
        amountB = amountA * reserveB / reserveA;
    }

    // 计算给定输入量可以换出多少代币（含 0.3% 手续费）
    // amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut)
        internal pure returns (uint amountOut)
    {
        require(amountIn > 0, 'UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
        uint amountInWithFee = amountIn * 997;
        uint numerator = amountInWithFee * reserveOut;
        uint denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    // 计算要换出指定数量，需要输入多少代币（含 0.3% 手续费）
    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut)
        internal pure returns (uint amountIn)
    {
        require(amountOut > 0, 'UniswapV2Library: INSUFFICIENT_OUTPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2Library: INSUFFICIENT_LIQUIDITY');
        uint numerator = reserveIn * amountOut * 1000;
        uint denominator = (reserveOut - amountOut) * 997;
        amountIn = (numerator / denominator) + 1;
    }

    // 多跳路由：计算路径中每一步的输出量
    function getAmountsOut(address factory, uint amountIn, address[] memory path)
        internal view returns (uint[] memory amounts)
    {
        require(path.length >= 2, 'UniswapV2Library: INVALID_PATH');
        amounts = new uint[](path.length);
        amounts[0] = amountIn;
        for (uint i; i < path.length - 1; i++) {
            (uint reserveIn, uint reserveOut) = getReserves(factory, path[i], path[i + 1]);
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    // 多跳路由：计算要换出指定输出量需要多少输入
    function getAmountsIn(address factory, uint amountOut, address[] memory path)
        internal view returns (uint[] memory amounts)
    {
        require(path.length >= 2, 'UniswapV2Library: INVALID_PATH');
        amounts = new uint[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint i = path.length - 1; i > 0; i--) {
            (uint reserveIn, uint reserveOut) = getReserves(factory, path[i - 1], path[i]);
            amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }
}


// 修改了接口名称，防止与 Router 合约冲突
interface IUniswapV2Pair_Library {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
}