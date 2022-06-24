// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./interfaces/IApeXPool.sol";
import "./interfaces/IStakingPoolFactory.sol";
import "../interfaces/IERC20.sol";
import "../utils/Reentrant.sol";

contract ApeXPool is IApeXPool, Reentrant {
    uint256 internal constant WEIGHT_MULTIPLIER = 1e6;
    uint256 internal constant MAX_TIME_STAKE_WEIGHT_MULTIPLIER = 2 * WEIGHT_MULTIPLIER;
    uint256 internal constant REWARD_PER_WEIGHT_MULTIPLIER = 1e12;

    address public immutable override poolToken;
    IStakingPoolFactory public immutable factory;
    uint256 public yieldRewardsPerWeight;
    uint256 public usersLockingWeight;
    mapping(address => User) public users;
    uint256 public immutable initTime;
    uint256 public immutable endTime;
    uint256 public immutable vestTime;
    bool public beyongEndTime;

    modifier onlyInTimePeriod () {
        require(initTime <= block.timestamp && block.timestamp <= endTime, "sp: ONLY_IN_TIME_PERIOD");
        _;
    }

    constructor(address _factory, address _poolToken, uint256 _initTime, uint256 _endTime, uint256 _vestTime) {
        require(_factory != address(0), "ap: INVALID_FACTORY");
        require(_poolToken != address(0), "ap: INVALID_POOL_TOKEN");

        factory = IStakingPoolFactory(_factory);
        poolToken = _poolToken;
        initTime = _initTime;
        endTime = _endTime;
        vestTime = _vestTime;
    }

    function stake(uint256 _amount, uint256 _lockDuration) external override nonReentrant onlyInTimePeriod {
        _stake(_amount, _lockDuration, false);
        IERC20(poolToken).transferFrom(msg.sender, address(this), _amount);
    }

    function stakeEsApeX(uint256 _amount, uint256 _lockDuration) external override nonReentrant onlyInTimePeriod {
        _stake(_amount, _lockDuration, true);
        factory.transferEsApeXFrom(msg.sender, address(factory), _amount);
    }

    function _stake(
        uint256 _amount,
        uint256 _lockDuration,
        bool _isEsApeX
    ) internal {
        require(_amount > 0, "ap.stake: INVALID_AMOUNT");
        uint256 now256 = block.timestamp;
        uint256 lockTime = factory.lockTime();
        require(
            _lockDuration == 0 || (_lockDuration > 0 && _lockDuration <= lockTime),
            "ap._stake: INVALID_LOCK_INTERVAL"
        );

        address _staker = msg.sender;
        User storage user = users[_staker];
        _processRewards(_staker, user);

        //if 0, not lock
        uint256 lockFrom = _lockDuration > 0 ? now256 : 0;
        uint256 stakeWeight = ((_lockDuration * WEIGHT_MULTIPLIER) / lockTime + WEIGHT_MULTIPLIER) * _amount;
        uint256 depositId = user.deposits.length;
        Deposit memory deposit = Deposit({
            amount: _amount,
            weight: stakeWeight,
            lockFrom: lockFrom,
            lockDuration: _lockDuration
        });

        if (_isEsApeX) {
            user.esDeposits.push(deposit);
        } else {
            user.deposits.push(deposit);
        }

        factory.mintVeApeX(_staker, stakeWeight / WEIGHT_MULTIPLIER);
        user.tokenAmount += _amount;
        user.subYieldRewards = user.subYieldRewards + (user.totalWeight * (yieldRewardsPerWeight - user.lastYieldRewardsPerWeight) / REWARD_PER_WEIGHT_MULTIPLIER);
        user.totalWeight += stakeWeight;
        usersLockingWeight += stakeWeight;
        user.lastYieldRewardsPerWeight = yieldRewardsPerWeight;

    emit Staked(_staker, depositId, _isEsApeX, _amount, lockFrom, lockFrom + _lockDuration);
    }

    function batchWithdraw(
        uint256[] memory depositIds,
        uint256[] memory depositAmounts,
        uint256[] memory yieldIds,
        uint256[] memory yieldAmounts,
        uint256[] memory esDepositIds,
        uint256[] memory esDepositAmounts
    ) external override {
        require(depositIds.length == depositAmounts.length, "ap.batchWithdraw: INVALID_DEPOSITS_AMOUNTS");
        require(yieldIds.length == yieldAmounts.length, "ap.batchWithdraw: INVALID_YIELDS_AMOUNTS");
        require(esDepositIds.length == esDepositAmounts.length, "ap.batchWithdraw: INVALID_ESDEPOSITS_AMOUNTS");

        User storage user = users[msg.sender];
        _processRewards(msg.sender, user);
        emit BatchWithdraw(
            msg.sender,
            depositIds,
            depositAmounts,
            yieldIds,
            yieldAmounts,
            esDepositIds,
            esDepositAmounts
        );
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
            require(_amount != 0, "ap.batchWithdraw: INVALID_DEPOSIT_AMOUNT");
            stakeDeposit = user.deposits[_id];
            require(
                stakeDeposit.lockFrom == 0 || block.timestamp > stakeDeposit.lockFrom + stakeDeposit.lockDuration,
                "ap.batchWithdraw: DEPOSIT_LOCKED"
            );
            require(stakeDeposit.amount >= _amount, "ap.batchWithdraw: EXCEED_DEPOSIT_STAKED");

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
        {
            uint256 esStakeAmount;
            for (uint256 i = 0; i < esDepositIds.length; i++) {
                _amount = esDepositAmounts[i];
                _id = esDepositIds[i];
                require(_amount != 0, "ap.batchWithdraw: INVALID_ESDEPOSIT_AMOUNT");
                stakeDeposit = user.esDeposits[_id];
                require(
                    stakeDeposit.lockFrom == 0 || block.timestamp > stakeDeposit.lockFrom + stakeDeposit.lockDuration,
                    "ap.batchWithdraw: ESDEPOSIT_LOCKED"
                );
                require(stakeDeposit.amount >= _amount, "ap.batchWithdraw: EXCEED_ESDEPOSIT_STAKED");

                newWeight =
                    ((stakeDeposit.lockDuration * WEIGHT_MULTIPLIER) /
                        lockTime +
                        WEIGHT_MULTIPLIER) *
                    (stakeDeposit.amount - _amount);

                esStakeAmount += _amount;
                deltaUsersLockingWeight += (stakeDeposit.weight - newWeight);

                if (stakeDeposit.amount == _amount) {
                    delete user.esDeposits[_id];
                } else {
                    stakeDeposit.amount -= _amount;
                    stakeDeposit.weight = newWeight;
                    user.esDeposits[_id] = stakeDeposit;
                }
            }
            if (esStakeAmount > 0) {
                user.tokenAmount -= esStakeAmount;
                factory.transferEsApeXTo(msg.sender, esStakeAmount);
            }
        }

        factory.burnVeApeX(msg.sender, deltaUsersLockingWeight / WEIGHT_MULTIPLIER);
        user.subYieldRewards = user.subYieldRewards + (user.totalWeight * (yieldRewardsPerWeight - user.lastYieldRewardsPerWeight) / REWARD_PER_WEIGHT_MULTIPLIER);
        user.totalWeight -= deltaUsersLockingWeight;
        usersLockingWeight -= deltaUsersLockingWeight;
        user.lastYieldRewardsPerWeight = yieldRewardsPerWeight;

        {
            uint256 yieldAmount;
            Yield memory stakeYield;
            for (uint256 i = 0; i < yieldIds.length; i++) {
                _amount = yieldAmounts[i];
                _id = yieldIds[i];
                require(_amount != 0, "ap.batchWithdraw: INVALID_YIELD_AMOUNT");
                stakeYield = user.yields[_id];
                require(block.timestamp > stakeYield.lockUntil, "ap.batchWithdraw: YIELD_LOCKED");
                require(stakeYield.amount >= _amount, "ap.batchWithdraw: EXCEED_YIELD_STAKED");

                yieldAmount += _amount;

                if (stakeYield.amount == _amount) {
                    delete user.yields[_id];
                } else {
                    stakeYield.amount -= _amount;
                    user.yields[_id] = stakeYield;
                }
            }

            if (yieldAmount > 0) {
                user.tokenAmount -= yieldAmount;
                factory.transferYieldTo(msg.sender, yieldAmount);
            }
        }

        if (stakeAmount > 0) {
            user.tokenAmount -= stakeAmount;
            IERC20(poolToken).transfer(msg.sender, stakeAmount);
        }
    }

    function forceWithdraw(uint256[] memory _yieldIds) external override {
        uint256 minRemainRatio = factory.minRemainRatioAfterBurn();
        address _staker = msg.sender;
        uint256 now256 = block.timestamp;

        User storage user = users[_staker];

        uint256 deltaTotalAmount;
        uint256 yieldAmount;

        //force withdraw vesting or vested rewards
        Yield memory yield;
        for (uint256 i = 0; i < _yieldIds.length; i++) {
            yield = user.yields[_yieldIds[i]];
            deltaTotalAmount += yield.amount;

            if (now256 >= yield.lockUntil) {
                yieldAmount += yield.amount;
            } else {
                yieldAmount +=
                    (yield.amount *
                        (minRemainRatio +
                            ((10000 - minRemainRatio) * (now256 - yield.lockFrom)) /
                            vestTime)) /
                    10000;
            }
            delete user.yields[_yieldIds[i]];
        }

        uint256 remainApeX = deltaTotalAmount - yieldAmount;
        factory.transferYieldToTreasury(remainApeX);

        user.tokenAmount -= deltaTotalAmount;
        factory.burnEsApeX(address(this), deltaTotalAmount);
        if (yieldAmount > 0) {
            factory.transferYieldTo(_staker, yieldAmount);
        }

        emit ForceWithdraw(_staker, _yieldIds);
    }

    //only can extend lock time
    function updateStakeLock(
        uint256 _id,
        uint256 _lockDuration,
        bool _isEsApeX
    ) external override {
        uint256 now256 = block.timestamp;
        require(_lockDuration > 0, "ap.updateStakeLock: INVALID_LOCK_DURATION");

        uint256 lockTime = factory.lockTime();
        address _staker = msg.sender;
        User storage user = users[_staker];
        _processRewards(_staker, user);

        Deposit storage stakeDeposit;
        if (_isEsApeX) {
            stakeDeposit = user.esDeposits[_id];
        } else {
            stakeDeposit = user.deposits[_id];
        }
        require(_lockDuration > stakeDeposit.lockDuration, "ap.updateStakeLock: INVALID_NEW_LOCK");

        if (stakeDeposit.lockFrom == 0) {
            require(_lockDuration <= lockTime, "ap.updateStakeLock: EXCEED_MAX_LOCK_PERIOD");
            stakeDeposit.lockFrom = now256;
        } else {
            require(_lockDuration <= lockTime, "ap.updateStakeLock: EXCEED_MAX_LOCK");
        }

        uint256 oldWeight = stakeDeposit.weight;
        uint256 newWeight = ((_lockDuration * WEIGHT_MULTIPLIER) /
            lockTime +
            WEIGHT_MULTIPLIER) * stakeDeposit.amount;

        factory.mintVeApeX(_staker, (newWeight - oldWeight) / WEIGHT_MULTIPLIER);
        stakeDeposit.lockDuration = _lockDuration;
        stakeDeposit.weight = newWeight;
        user.subYieldRewards = user.subYieldRewards + (user.totalWeight * (yieldRewardsPerWeight - user.lastYieldRewardsPerWeight) / REWARD_PER_WEIGHT_MULTIPLIER);
        user.totalWeight = user.totalWeight - oldWeight + newWeight;
        usersLockingWeight = usersLockingWeight - oldWeight + newWeight;
        user.lastYieldRewardsPerWeight = yieldRewardsPerWeight;

        emit UpdateStakeLock(_staker, _id, _isEsApeX, stakeDeposit.lockFrom, stakeDeposit.lockFrom + _lockDuration);
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

    //update weight price, then if apeX, add deposits; if not, stake as pool.
    function _processRewards(address _staker, User storage user) internal {
        syncWeightPrice();

        //if no yield
        if (user.totalWeight == 0) return;
        uint256 yieldAmount = (user.totalWeight * (yieldRewardsPerWeight - user.lastYieldRewardsPerWeight)) /
        REWARD_PER_WEIGHT_MULTIPLIER;
        if (yieldAmount == 0) return;

        //mint esApeX to _staker
        factory.mintEsApeX(_staker, yieldAmount);
        emit MintEsApeX(_staker, yieldAmount);
    }

    function vest(uint256 vestAmount) external override {
        User storage user = users[msg.sender];

        uint256 now256 = block.timestamp;
        uint256 lockUntil = now256 + vestTime;
        emit YieldClaimed(msg.sender, user.yields.length, vestAmount, now256, lockUntil);

        user.yields.push(Yield({amount: vestAmount, lockFrom: now256, lockUntil: lockUntil}));
        user.tokenAmount += vestAmount;

        factory.transferEsApeXFrom(msg.sender, address(this), vestAmount);
    }

    function pendingYieldRewards(address _staker) public returns (uint256 pending) {
        uint256 newYieldRewardsPerWeight = yieldRewardsPerWeight;

        if (usersLockingWeight != 0) {
            (uint256 apeXReward,) = factory.calStakingPoolApeXReward(poolToken);
            newYieldRewardsPerWeight += (apeXReward * REWARD_PER_WEIGHT_MULTIPLIER) / usersLockingWeight;
        }

        User memory user = users[_staker];
        pending = (user.totalWeight * (yieldRewardsPerWeight - user.lastYieldRewardsPerWeight)) / REWARD_PER_WEIGHT_MULTIPLIER;
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

    function getYield(address _user, uint256 _yieldId) external view override returns (Yield memory) {
        return users[_user].yields[_yieldId];
    }

    function getYieldsLength(address _user) external view override returns (uint256) {
        return users[_user].yields.length;
    }

    function getEsDeposit(address _user, uint256 _id) external view override returns (Deposit memory) {
        return users[_user].esDeposits[_id];
    }

    function getEsDepositsLength(address _user) external view override returns (uint256) {
        return users[_user].esDeposits.length;
    }
}
