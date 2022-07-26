// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

contract BananaDistributor {
    address public token; // $BANA token address
    address public rewardRecipient;

    uint256 public duration; // each epoch duration time in seconds, 7*24*3600 means one week
    uint256 public distributeTime;
    uint256 public reward;

    constructor(
        address token_, 
        address rewardRecipient_,
        uint256 duration_,
        uint256 distributeTime_,
        uint256 initReward
    ) {
        token = token_;
        rewardRecipient = rewardRecipient_;
        duration = duration_;
        distributeTime = distributeTime_;
        reward = initReward;
    }

    function distribute() external {
        require(msg.sender == rewardRecipient, "forbidden");
        require(distributeTime >= block.timestamp, "not right time");
        distributeTime = distributeTime + duration;
        
    }
}