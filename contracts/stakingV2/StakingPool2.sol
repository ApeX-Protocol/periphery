// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./interfaces/IStakingPool2.sol";
import "../utils/Ownable.sol";
import "../libraries/TransferHelper.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract StakingPool2 is IStakingPool2, Ownable, Initializable {
    struct RewardState {
        uint256 index;
        uint256 timestamp;
    }

    struct FixedDeposit {
        uint256 amount;
        uint256 shares;
        uint256 expireAt;
    }

    struct UserInfo {
        uint256 currentDeposit;
        uint256 shares;
        uint256 index;
        uint256 rewardAccrued;
        FixedDeposit[] fixedDeposits;
    }

    uint256 public constant ONE_YEAR = 365 * 24 * 3600;
    uint256 public constant INDEX_SCALE = 1e36;

    address public override stakeToken;
    address public override rewardToken;

    uint256 public override rewardsPerSecond;
    uint256 public override endTime;
    uint256 public override minPeriod;
    uint256 public override totalShares;

    RewardState public poolRewardState;
    mapping(address => UserInfo) public userInfos;

    function initialize(
        address _owner,
        address _stakeToken,
        address _rewardToken,
        uint256 _rewardPerSecond,
        uint256 _endTime,
        uint256 _minPeriod
    ) external initializer {
        owner = _owner;
        stakeToken = _stakeToken;
        rewardToken = _rewardToken;
        rewardsPerSecond = _rewardPerSecond;
        endTime = _endTime;
        minPeriod = _minPeriod;
        poolRewardState = RewardState(INDEX_SCALE, block.timestamp);
    }

    function updateRewardsPerSecond(uint256 newRewardsPerSecond) external onlyOwner {
        emit RewardsPerSecondUpdated(rewardsPerSecond, newRewardsPerSecond);
        rewardsPerSecond = newRewardsPerSecond;
    }

    function updateEndTime(uint256 newEndTime) external onlyOwner {
        emit EndTimeUpdated(endTime, newEndTime);
        endTime = newEndTime;
    }

    function updateMinPeriod(uint256 newMinPeriod) external onlyOwner {
        emit MinPeriodUpdated(minPeriod, newMinPeriod);
        minPeriod = newMinPeriod;
    }

    function sharesOf(address user) external view override returns (uint256) {
        return userInfos[user].shares;
    }

    function rewardClaimable(address user) public view override returns (uint256) {
        uint256 poolIndex;
        uint256 deltaTime = block.timestamp - poolRewardState.timestamp;
        if (deltaTime > 0 && rewardsPerSecond > 0) {
            uint256 rewardsAccrued = deltaTime * rewardsPerSecond;
            uint256 ratio = totalShares > 0 ? (rewardsAccrued * INDEX_SCALE) / totalShares : 0;
            poolIndex = poolRewardState.index + ratio;
        }

        uint256 userIndex = userInfos[user].index;
        if (userIndex == 0 && poolIndex >= INDEX_SCALE) {
            userIndex = INDEX_SCALE;
        }

        uint256 deltaIndex = poolIndex - userIndex;
        uint256 userShares = userInfos[user].shares;
        uint256 userRewardDelta = deltaIndex * userShares;
        return userInfos[user].rewardAccrued + userRewardDelta;
    }

    function withdrawable(address user) public view override returns (uint256) {
        uint256 currentTime = block.timestamp;
        UserInfo memory userInfo = userInfos[user];
        uint256 result = userInfo.currentDeposit;
        FixedDeposit[] memory fixeds = userInfo.fixedDeposits;
        FixedDeposit memory _fixed;
        for (uint256 i = 0; i < fixeds.length; i++) {
            _fixed = fixeds[i];
            if (_fixed.amount > 0 && _fixed.expireAt <= currentTime) {
                result += _fixed.amount;
            }
        }
        return result;
    }

    function deposit(uint256 amount, uint256 period) external override {
        require(amount > 0, "zero amount");

        _updatePoolRewardIndex();
        _distributeUserReward(msg.sender);
        _updateExpiredFixedsToCurrent(msg.sender);

        TransferHelper.safeTransferFrom(stakeToken, msg.sender, address(this), amount);
        if (period == 0) {
            _mintShares(msg.sender, amount);
            userInfos[msg.sender].currentDeposit += amount;
            emit Deposited(msg.sender, amount, 0, 0);
        } else {
            require(period >= minPeriod, "less than min period");
            uint256 expireAt = block.timestamp + period;
            require(expireAt <= endTime, "expiration time over end time");

            uint256 shares = amount + (amount * 3 * period) / ONE_YEAR;
            _mintShares(msg.sender, shares);

            FixedDeposit memory fixedDeposit = FixedDeposit(amount, shares, expireAt);
            userInfos[msg.sender].fixedDeposits.push(fixedDeposit);
            emit Deposited(msg.sender, amount, period, expireAt);
        }
    }

    function withdraw(address to, uint256 amount) external override {
        _updatePoolRewardIndex();
        _distributeUserReward(msg.sender);
        _updateExpiredFixedsToCurrent(msg.sender);

        require(amount <= userInfos[msg.sender].currentDeposit, "over withdrawable");
        _burnShares(msg.sender, amount);
        userInfos[msg.sender].currentDeposit -= amount;
        TransferHelper.safeTransfer(stakeToken, to, amount);
        emit Withdrawn(msg.sender, to, amount);
    }

    function claimReward(address to) external override returns (uint256 claimed) {
        _updatePoolRewardIndex();
        _distributeUserReward(msg.sender);
        _updateExpiredFixedsToCurrent(msg.sender);

        claimed = userInfos[msg.sender].rewardAccrued;
        userInfos[msg.sender].rewardAccrued = 0;
        TransferHelper.safeTransfer(rewardToken, to, claimed);
        emit RewardClaimed(msg.sender, to, claimed);
    }

    function _updatePoolRewardIndex() internal {
        uint256 deltaTime = block.timestamp - poolRewardState.timestamp;
        if (deltaTime > 0 && rewardsPerSecond > 0) {
            uint256 rewardsAccrued = deltaTime * rewardsPerSecond;
            uint256 ratio = totalShares > 0 ? (rewardsAccrued * INDEX_SCALE) / totalShares : 0;
            poolRewardState.index = poolRewardState.index + ratio;
            poolRewardState.timestamp = block.timestamp;
        } else if (deltaTime > 0) {
            poolRewardState.timestamp = block.timestamp;
        }
    }

    function _distributeUserReward(address user) internal {
        uint256 poolIndex = poolRewardState.index;
        uint256 userIndex = userInfos[user].index;
        // Update user's index to the current pool index
        userInfos[user].index = poolIndex;

        if (userIndex == 0 && poolIndex >= INDEX_SCALE) {
            userIndex = INDEX_SCALE;
        }

        uint256 deltaIndex = poolIndex - userIndex;
        uint256 userShares = userInfos[user].shares;
        uint256 userRewardDelta = deltaIndex * userShares;
        userInfos[user].rewardAccrued += userRewardDelta;

        emit DistributedUserReward(user, userRewardDelta, poolIndex);
    }

    function _updateExpiredFixedsToCurrent(address user) internal {
        uint256 currentTime = block.timestamp;
        UserInfo memory userInfo = userInfos[user];
        uint256 currentDeposit = userInfo.currentDeposit;
        uint256 sharesToBeBurnt;
        FixedDeposit[] memory fixeds = userInfo.fixedDeposits;
        FixedDeposit memory _fixed;
        for (uint256 i = 0; i < fixeds.length; i++) {
            _fixed = fixeds[i];
            if (_fixed.amount > 0 && _fixed.expireAt <= currentTime) {
                currentDeposit += _fixed.amount;
                sharesToBeBurnt += _fixed.shares - _fixed.amount;
                delete userInfos[user].fixedDeposits[i];
            }
        }
        userInfos[user].currentDeposit = currentDeposit;
        _burnShares(user, sharesToBeBurnt);
    }

    function _mintShares(address user, uint256 shares) internal {
        totalShares += shares;
        userInfos[user].shares += shares;
        emit SharesTransferred(address(0), user, shares);
    }

    function _burnShares(address user, uint256 shares) internal {
        require(userInfos[user].shares >= shares, "not enough shares to be burnt");
        totalShares -= shares;
        userInfos[user].shares -= shares;
        emit SharesTransferred(user, address(0), shares);
    }
}
