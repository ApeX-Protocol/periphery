// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.0;

interface IPair {
    function factory() external view returns (address);

    function tokenA() external view returns (address);

    function tokenB() external view returns (address);

    function LP_FEE() external pure returns (uint256);

    function orderBlockInterval() external pure returns (uint256);

    function reserveMap(address) external view returns (uint256);

    function tmpMapWETH(address) external view returns (uint256);

    function tokenAReserves() external view returns (uint256);

    function tokenBReserves() external view returns (uint256);

    function getTotalSupply() external view returns (uint256);

    function resetMapWETH(address to) external;

    event InitialLiquidityProvided(
        address indexed addr,
        uint256 amountA,
        uint256 amountB
    );
    event LiquidityProvided(address indexed addr, uint256 lpTokenAmount);
    event LiquidityRemoved(address indexed addr, uint256 lpTokenAmount);
    event InstantSwapAToB(
        address indexed addr,
        uint256 amountAIn,
        uint256 amountBOut
    );
    event InstantSwapBToA(
        address indexed addr,
        uint256 amountBIn,
        uint256 amountAOut
    );
    event LongTermSwapAToB(
        address indexed addr,
        uint256 amountAIn,
        uint256 orderId
    );
    event LongTermSwapBToA(
        address indexed addr,
        uint256 amountBIn,
        uint256 orderId
    );
    event CancelLongTermOrder(address indexed addr, uint256 orderId);
    event WithdrawProceedsFromLongTermOrder(
        address indexed addr,
        uint256 orderId
    );

    function provideInitialLiquidity(
        address to,
        uint256 amountA,
        uint256 amountB
    ) external;

    function provideLiquidity(address to, uint256 lpTokenAmount) external;

    function removeLiquidity(
        address to,
        uint256 lpTokenAmount,
        bool proceedETH
    ) external;

    function instantSwapFromAToB(
        address sender,
        uint256 amountAIn,
        bool proceedETH
    ) external;

    function longTermSwapFromAToB(
        address sender,
        uint256 amountAIn,
        uint256 numberOfBlockIntervals
    ) external;

    function instantSwapFromBToA(
        address sender,
        uint256 amountBIn,
        bool proceedETH
    ) external;

    function longTermSwapFromBToA(
        address sender,
        uint256 amountBIn,
        uint256 numberOfBlockIntervals
    ) external;

    function cancelLongTermSwap(
        address sender,
        uint256 orderId,
        bool proceedETH
    ) external;

    function withdrawProceedsFromLongTermSwap(
        address sender,
        uint256 orderId,
        bool proceedETH
    ) external;

    function getOrderProceeds(uint256 orderId)
        external
        view
        returns (uint256 withdrawableProceeds);

    function getTWAMMCurrentSalesRate()
        external
        view
        returns (uint256 tokenASalesRate, uint256 tokenBSalesRate);

    function userIdsCheck(address userAddress)
        external
        view
        returns (uint256[] memory);

    function orderIdStatusCheck(uint256 orderId) external view returns (bool);

    function executeVirtualOrders(uint256 blockNumber) external;
}
