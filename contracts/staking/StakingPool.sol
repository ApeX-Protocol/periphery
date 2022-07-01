// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./interfaces/IStakingPool.sol";
import "./interfaces/IStakingPoolFactory.sol";
import "../interfaces/IERC20.sol";
import "../utils/Reentrant.sol";
import "../utils/Initializable.sol";

contract StakingPool is IStakingPool, Reentrant, Initializable {
    uint256 internal constant WEIGHT_MULTIPLIER = 1e6;
    uint256 internal constant MAX_TIME_STAKE_WEIGHT_MULTIPLIER = 2 * WEIGHT_MULTIPLIER;
    uint256 internal constant REWARD_PER_WEIGHT_MULTIPLIER = 1e12;

    address public override poolToken;
    IStakingPoolFactory public factory;
    uint256 public yieldRewardsPerWeight;
    uint256 public usersLockingWeight;
    mapping(address => User) public users;
    uint256 public initTime;
    uint256 public endTime;
    bool public beyongEndTime;

    modifier onlyInTimePeriod () {
        require(initTime <= block.timestamp && block.timestamp <= endTime, "sp: ONLY_IN_TIME_PERIOD");
        _;
    }

    function initialize(address _factory, address _poolToken, uint256 _initTime, uint256 _endTime) external override initializer {
        factory = IStakingPoolFactory(_factory);
        poolToken = _poolToken;
        initTime = _initTime;
        endTime = _endTime;
    }

    function stake(uint256 _amount, uint256 _lockDuration) external override nonReentrant onlyInTimePeriod {
        require(_amount > 0, "sp.stake: INVALID_AMOUNT");
        uint256 now256 = block.timestamp;
        uint256 lockTime = factory.lockTime();
        require(
            _lockDuration == 0 || (_lockDuration > 0 && _lockDuration <= lockTime),
            "sp._stake: INVALID_LOCK_INTERVAL"
        );

        address _staker = msg.sender;
        User storage user = users[_staker];
        _processRewards(_staker, user);

        //if 0, not lock
        uint256 lockFrom = _lockDuration > 0 ? now256 : 0;
        uint256 stakeWeight = ((_lockDuration * WEIGHT_MULTIPLIER) / lockTime + WEIGHT_MULTIPLIER) * _amount;
        uint256 depositId = user.deposits.length;
        Deposit memory deposit = Deposit({
        amount : _amount,
        weight : stakeWeight,
        lockFrom : lockFrom,
        lockDuration : _lockDuration
        });

        user.deposits.push(deposit);
        user.tokenAmount += _amount;
        user.subYieldRewards = user.subYieldRewards + (user.totalWeight * (yieldRewardsPerWeight - user.lastYieldRewardsPerWeight) / REWARD_PER_WEIGHT_MULTIPLIER);
        user.totalWeight += stakeWeight;
        usersLockingWeight += stakeWeight;
        user.lastYieldRewardsPerWeight = yieldRewardsPerWeight;

        emit Staked(_staker, depositId, _amount, lockFrom, lockFrom + _lockDuration);
        IERC20(poolToken).transferFrom(msg.sender, address(this), _amount);
    }

    function batchWithdraw(uint256[] memory depositIds, uint256[] memory depositAmounts) external override {
        require(depositIds.length == depositAmounts.length, "sp.batchWithdraw: INVALID_DEPOSITS_AMOUNTS");

        User storage user = users[msg.sender];
        _processRewards(msg.sender, user);
        emit BatchWithdraw(msg.sender, depositIds, depositAmounts);
        uint256 lockTime = factory.lockTime();

        uint256 _amount;
        uint256 _id;
        uint256 stakeAmount;
        uint256 newWeight;
        uint256 deltaUsersLockingWeight;
        Deposit memory stakeDeposit;
        for (uint256 i = 0; i < depositIds.length; i++) {
            _amount = depositAmounts[i];
            _id = depositIds[i];
            require(_amount != 0, "sp.batchWithdraw: INVALID_DEPOSIT_AMOUNT");
            stakeDeposit = user.deposits[_id];
            require(
                stakeDeposit.lockFrom == 0 || block.timestamp > stakeDeposit.lockFrom + stakeDeposit.lockDuration,
                "sp.batchWithdraw: DEPOSIT_LOCKED"
            );
            require(stakeDeposit.amount >= _amount, "sp.batchWithdraw: EXCEED_DEPOSIT_STAKED");

            newWeight =
            ((stakeDeposit.lockDuration * WEIGHT_MULTIPLIER) /
            lockTime +
            WEIGHT_MULTIPLIER) *
            (stakeDeposit.amount - _amount);

            stakeAmount += _amount;
            deltaUsersLockingWeight += (stakeDeposit.weight - newWeight);

            if (stakeDeposit.amount == _amount) {
                delete user.deposits[_id];
            } else {
                stakeDeposit.amount -= _amount;
                stakeDeposit.weight = newWeight;
                user.deposits[_id] = stakeDeposit;
            }
        }

        user.subYieldRewards = user.subYieldRewards + (user.totalWeight * (yieldRewardsPerWeight - user.lastYieldRewardsPerWeight) / REWARD_PER_WEIGHT_MULTIPLIER);
        user.totalWeight -= deltaUsersLockingWeight;
        usersLockingWeight -= deltaUsersLockingWeight;
        user.lastYieldRewardsPerWeight = yieldRewardsPerWeight;

        if (stakeAmount > 0) {
            user.tokenAmount -= stakeAmount;
            IERC20(poolToken).transfer(msg.sender, stakeAmount);
        }
    }

    function updateStakeLock(uint256 _id, uint256 _lockDuration) external override {
        uint256 now256 = block.timestamp;
        require(_lockDuration > 0, "sp.updateStakeLock: INVALID_LOCK_DURATION");

        uint256 lockTime = factory.lockTime();
        address _staker = msg.sender;
        User storage user = users[_staker];
        _processRewards(_staker, user);

        Deposit storage stakeDeposit;

        stakeDeposit = user.deposits[_id];

        require(_lockDuration > stakeDeposit.lockDuration, "sp.updateStakeLock: INVALID_NEW_LOCK");

        if (stakeDeposit.lockFrom == 0) {
            require(_lockDuration <= lockTime, "sp.updateStakeLock: EXCEED_MAX_LOCK_PERIOD");
            stakeDeposit.lockFrom = now256;
        } else {
            require(_lockDuration <= lockTime, "sp.updateStakeLock: EXCEED_MAX_LOCK");
        }

        uint256 oldWeight = stakeDeposit.weight;
        uint256 newWeight = ((_lockDuration * WEIGHT_MULTIPLIER) /
        lockTime +
        WEIGHT_MULTIPLIER) * stakeDeposit.amount;

        stakeDeposit.lockDuration = _lockDuration;
        stakeDeposit.weight = newWeight;
        user.subYieldRewards = user.subYieldRewards + (user.totalWeight * (yieldRewardsPerWeight - user.lastYieldRewardsPerWeight) / REWARD_PER_WEIGHT_MULTIPLIER);
        user.totalWeight = user.totalWeight - oldWeight + newWeight;
        usersLockingWeight = usersLockingWeight - oldWeight + newWeight;
        user.lastYieldRewardsPerWeight = yieldRewardsPerWeight;

        emit UpdateStakeLock(_staker, _id, stakeDeposit.lockFrom, stakeDeposit.lockFrom + _lockDuration);
    }

    function processRewards() external override {
        address staker = msg.sender;
        User storage user = users[staker];

        _processRewards(staker, user);
        user.subYieldRewards = user.subYieldRewards + (user.totalWeight * (yieldRewardsPerWeight - user.lastYieldRewardsPerWeight) / REWARD_PER_WEIGHT_MULTIPLIER);
        user.lastYieldRewardsPerWeight = yieldRewardsPerWeight;
    }

    function syncWeightPrice() override public {
        uint256 apeXReward = 0;
        if (beyongEndTime == false) {
            apeXReward = factory.syncYieldPriceOfWeight();
        }

        if (factory.shouldUpdateRatio()) {
            factory.updateApeXPerSec();
        }

        if (usersLockingWeight == 0) {
            return;
        }

        if (block.timestamp <= endTime + 3 * 3600 && beyongEndTime == false) {
            yieldRewardsPerWeight += (apeXReward * REWARD_PER_WEIGHT_MULTIPLIER) / usersLockingWeight;
            emit Synchronized(msg.sender, yieldRewardsPerWeight);
        }
        if (block.timestamp > endTime) {
            beyongEndTime = true;
        }
    }

    function _processRewards(address _staker, User storage user) internal {
        syncWeightPrice();

        //if no yield
        if (user.totalWeight == 0) return;
        uint256 yieldAmount = (user.totalWeight * (yieldRewardsPerWeight - user.lastYieldRewardsPerWeight)) /
        REWARD_PER_WEIGHT_MULTIPLIER;
        if (yieldAmount == 0) return;

        factory.mintEsApeX(_staker, yieldAmount);
        emit MintEsApeX(_staker, yieldAmount);
    }

    function pendingYieldRewards(address _staker) external view returns (uint256 pending) {
        uint256 newYieldRewardsPerWeight = yieldRewardsPerWeight;

        if (usersLockingWeight != 0) {
            (uint256 apeXReward,) = factory.calStakingPoolApeXReward(poolToken);
            newYieldRewardsPerWeight += (apeXReward * REWARD_PER_WEIGHT_MULTIPLIER) / usersLockingWeight;
        }

        User memory user = users[_staker];
        pending = (user.totalWeight * (newYieldRewardsPerWeight - user.lastYieldRewardsPerWeight)) / REWARD_PER_WEIGHT_MULTIPLIER;
    }

    function getStakeInfo(address _user)
    external
    view
    override
    returns (
        uint256 tokenAmount,
        uint256 totalWeight,
        uint256 subYieldRewards
    )
    {
        User memory user = users[_user];
        return (user.tokenAmount, user.totalWeight, user.subYieldRewards);
    }

    function getDeposit(address _user, uint256 _id) external view override returns (Deposit memory) {
        return users[_user].deposits[_id];
    }

    function getDepositsLength(address _user) external view override returns (uint256) {
        return users[_user].deposits.length;
    }

    function getYieldRewardsPerWeight() external view override returns (uint256) {
        return yieldRewardsPerWeight;
    }

    function getUsersLockingWeight() external view override returns (uint256) {
        return usersLockingWeight;
    }

    function getUsers(address user) external override view returns (User memory) {
        return users[user];
    }
}
