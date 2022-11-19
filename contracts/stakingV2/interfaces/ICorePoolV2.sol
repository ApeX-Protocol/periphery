// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

interface ICorePoolV2 {
    struct Deposit {
        uint256 amount;
        uint256 weight;
        uint256 lockFrom;
        uint256 lockDuration;
    }
}
