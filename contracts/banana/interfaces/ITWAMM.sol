// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

interface ITWAMM {
    function obtainReserves(address token0, address token1)
        external view
        returns (uint256 reserve0, uint256 reserve1);
}