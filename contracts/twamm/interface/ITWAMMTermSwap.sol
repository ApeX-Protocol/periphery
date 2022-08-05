// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

interface ITWAMMTermSwap {
    function longTermSwapTokenToToken(
        address token0,
        address token1,
        uint256 amountIn,
        uint256 numberOfBlockIntervals,
        uint256 deadline
    ) external returns (uint256 orderId);

    function longTermSwapTokenToETH(
        address token,
        uint256 amountTokenIn,
        uint256 numberOfBlockIntervals,
        uint256 deadline
    ) external returns (uint256 orderId);

    function longTermSwapETHToToken(
        address token,
        uint256 amountETHIn,
        uint256 numberOfBlockIntervals,
        uint256 deadline
    ) external payable returns (uint256 orderId);

    function cancelTermSwapTokenToToken(
        address token0,
        address token1,
        uint256 orderId,
        uint256 deadline
    ) external;

    function cancelTermSwapTokenToETH(
        address token,
        uint256 orderId,
        uint256 deadline
    ) external;

    function cancelTermSwapETHToToken(
        address token,
        uint256 orderId,
        uint256 deadline
    ) external;

    function withdrawProceedsFromTermSwapTokenToToken(
        address token0,
        address token1,
        uint256 orderId,
        uint256 deadline
    ) external;

    function withdrawProceedsFromTermSwapTokenToETH(
        address token,
        uint256 orderId,
        uint256 deadline
    ) external;

    function withdrawProceedsFromTermSwapETHToToken(
        address token,
        uint256 orderId,
        uint256 deadline
    ) external;
}
