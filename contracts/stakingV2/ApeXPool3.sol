// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./interfaces/IApeXPool3.sol";
import "../utils/Ownable.sol";
import "../libraries/TransferHelper.sol";

contract ApeXPool3 is IApeXPool3, Ownable {
    address public immutable override apeX;
    address public immutable override esApeX;

    struct stakingInfo{
        address owner;
        uint256 accountId;
        uint256 amount;
        uint256 lockPeriod;
        uint256 lockStart;
    }

    mapping(uint256 => stakingInfo) public stakingAPEX;
    mapping(uint256 => stakingInfo) public stakingEsAPEX;

    uint256 public globalStakeId;
    bool public override paused;

    constructor(address _apeX, address _esApeX, address _owner) {
        apeX = _apeX;
        esApeX = _esApeX;
        owner = _owner;
    }

    function setPaused(bool newState) external override onlyOwner {
        require(paused != newState, "same state");
        paused = newState;
        emit PausedStateChanged(newState);
    }

    function stakeAPEX(uint256 accountId, uint256 amount,uint256 lockPeriod) external override {
        require(!paused, "paused");
        TransferHelper.safeTransferFrom(apeX, msg.sender, address(this), amount);

        globalStakeId++;
        stakingAPEX[globalStakeId] = stakingInfo({
            owner: msg.sender,
            accountId: accountId,
            amount: amount,
            lockPeriod: lockPeriod,
            lockStart: block.timestamp
        });

        emit Staked(apeX, msg.sender, globalStakeId, accountId, amount,lockPeriod);
    }

    function stakeEsAPEX(uint256 accountId, uint256 amount,uint256 lockPeriod) external override {
        require(!paused, "paused");
        TransferHelper.safeTransferFrom(esApeX, msg.sender, address(this), amount);
       
        globalStakeId++;
        stakingEsAPEX[globalStakeId] = stakingInfo({
            owner: msg.sender,
            accountId: accountId,
            amount: amount,
            lockPeriod: lockPeriod,
            lockStart: block.timestamp
        });

        emit Staked(esApeX, msg.sender, globalStakeId, accountId, amount,lockPeriod);
    }

    function unstakeAPEX(uint256 stakeId) external override {
        stakingInfo memory info = stakingAPEX[stakeId];
        require(info.lockStart+info.lockPeriod <= block.timestamp,"in lock period");

        TransferHelper.safeTransfer(apeX, info.owner, info.amount);
        emit Unstaked(stakeId);
    }

    function unstakeEsAPEX(uint256 stakeId) external override {
        stakingInfo memory info = stakingEsAPEX[stakeId];
        require(info.lockStart+info.lockPeriod <= block.timestamp,"in lock period");

        TransferHelper.safeTransfer(esApeX, info.owner, info.amount);
        emit Unstaked(stakeId);
    }
}
