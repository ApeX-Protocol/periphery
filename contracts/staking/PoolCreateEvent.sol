// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

//                            _ooOoo_
//                           o8888888o
//                           88" . "88
//                           (| -_- |)
//                            O\ = /O
//                        ____/`---'\____
//                      .   ' \\| |// `.
//                       / \\||| : |||// \
//                     / _||||| -:- |||||- \
//                       | | \\\ - /// | |
//                     | \_| ''\---/'' | |
//                      \ .-\__ `-` ___/-. /
//                   ___`. .' /--.--\ `. . __
//                ."" '< `.___\_<|>_/___.' >'"".
//               | | : `- \`.;`\ _ /`;.`/ - ` : | |
//                 \ \ `-. \_ __\ /__ _/ .-` / /
//         ======`-.____`-.___\_____/___.-`____.-'======
//                            `=---='
contract PoolCreateEvent {

    event PoolCreated(address indexed factory,
        address indexed pool,
        uint256 indexed apeXPerSec,
        uint256 secSpanPerUpdate,
        uint256 initTimestamp,
        uint256 lockTime);

    function PoolCreate(address factory,
        address pool,
        uint256 apeXPerSec,
        uint256 secSpanPerUpdate,
        uint256 initTimestamp,
        uint256 lockTime) external {
        emit PoolCreated(factory, pool, apeXPerSec, secSpanPerUpdate, initTimestamp, lockTime);
    }
}
