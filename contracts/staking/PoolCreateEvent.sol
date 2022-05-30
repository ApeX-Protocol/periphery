// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

contract PoolCreateEvent {

    event PoolCreated(address indexed factory, address indexed pool, bool isApeXPool);

    function PoolCreate(address factory, address pool, bool isApeXPool) external {
        emit PoolCreated(factory, pool, isApeXPool);
    }
}
