// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

interface ITWAMMLiquidity {
    function addLiquidity(
        address token0,
        address token1,
        uint256 lpTokenAmount,
        uint256 deadline
    ) external;

    function addLiquidityETH(
        address token,
        uint256 lpTokenAmount,
        uint256 deadline
    ) external payable;

    function withdrawLiquidity(
        address token0,
        address token1,
        uint256 lpTokenAmount,
        uint256 deadline
    ) external;

    function withdrawLiquidityETH(
        address token,
        uint256 lpTokenAmount,
        uint256 deadline
    ) external;
}
