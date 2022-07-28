// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

interface ITWAMM {
    function factory() external view returns (address);

    function WETH() external view returns (address);

    function obtainReserves(address token0, address token1)
        external view
        returns (uint256 reserve0, uint256 reserve1);

    function obtainTotalSupply(address pair) external view returns (uint256);

    function obtainPairAddress(address token0, address token1)
        external view
        returns (address);

    function createPairWrapper(
        address token0,
        address token1,
        uint256 deadline
    ) external;

    function addInitialLiquidity(
        address token0,
        address token1,
        uint256 amount0,
        uint256 amount1,
        uint256 deadline
    ) external;

    function addInitialLiquidityETH(
        address token,
        uint256 amountToken,
        uint256 amountETH,
        uint256 deadline
    ) external payable;

    function executeVirtualOrdersWrapper(address pair, uint256 blockNumber)
        external;
}
