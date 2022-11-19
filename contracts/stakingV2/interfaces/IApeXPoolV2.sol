// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

interface IApeXPoolV2 {
    function apeX() external view returns (address);

    function esApeX() external view returns (address);

    function veApeX() external view returns (address);

    function stakeApeX(uint256 amount, uint256 lockDuration) external;

    function stakeEsApeX(uint256 amount, uint256 lockDuration) external;

    function unstakeApeX(uint256) external;
}
