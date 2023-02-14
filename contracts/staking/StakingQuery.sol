// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.4;

import "./interfaces/IStakingPool.sol";
import "./interfaces/IApeXPool.sol";

contract StakingQuery {
    IStakingPool public lpPool;
    IApeXPool public apeXPool;

    constructor(address _lpPool, address _apeXPool) {
        lpPool = IStakingPool(_lpPool);
        apeXPool = IApeXPool(_apeXPool);
    }

    function getWithdrawableLPs(
        address user
    ) external view returns (uint256[] memory depositIds, uint256[] memory amounts) {
        uint256 length = lpPool.getDepositsLength(user);
        uint256[] memory ids = new uint256[](length);
        uint256 count;
        IStakingPool.Deposit memory _deposit;
        for (uint256 i = 0; i < length; i++) {
            _deposit = lpPool.getDeposit(user, i);
            if (
                _deposit.amount > 0 &&
                (_deposit.lockFrom == 0 || block.timestamp > _deposit.lockFrom + _deposit.lockDuration)
            ) {
                ids[count] = i;
                count += 1;
            }
        }

        depositIds = new uint256[](count);
        amounts = new uint256[](count);
        uint256 tempId;
        for (uint256 j = 0; j < count; j++) {
            tempId = ids[j];
            depositIds[j] = tempId;
            amounts[j] = lpPool.getDeposit(user, tempId).amount;
        }
    }

    function getWithdrawableAPEX(
        address user
    ) external view returns (uint256[] memory depositIds, uint256[] memory amounts) {
        uint256 length = apeXPool.getDepositsLength(user);
        uint256[] memory ids = new uint256[](length);
        uint256 count;
        IApeXPool.Deposit memory _deposit;
        for (uint256 i = 0; i < length; i++) {
            _deposit = apeXPool.getDeposit(user, i);
            if (
                _deposit.amount > 0 &&
                (_deposit.lockFrom == 0 || block.timestamp > _deposit.lockFrom + _deposit.lockDuration)
            ) {
                ids[count] = i;
                count += 1;
            }
        }

        depositIds = new uint256[](count);
        amounts = new uint256[](count);
        uint256 tempId;
        for (uint256 j = 0; j < count; j++) {
            tempId = ids[j];
            depositIds[j] = tempId;
            amounts[j] = apeXPool.getDeposit(user, tempId).amount;
        }
    }

    function getWithdrawableEsAPEX(
        address user
    ) external view returns (uint256[] memory depositIds, uint256[] memory amounts) {
        uint256 length = apeXPool.getEsDepositsLength(user);
        uint256[] memory ids = new uint256[](length);
        uint256 count;
        IApeXPool.Deposit memory _deposit;
        for (uint256 i = 0; i < length; i++) {
            _deposit = apeXPool.getEsDeposit(user, i);
            if (
                _deposit.amount > 0 &&
                (_deposit.lockFrom == 0 || block.timestamp > _deposit.lockFrom + _deposit.lockDuration)
            ) {
                ids[count] = i;
                count += 1;
            }
        }

        depositIds = new uint256[](count);
        amounts = new uint256[](count);
        uint256 tempId;
        for (uint256 j = 0; j < count; j++) {
            tempId = depositIds[j];
            depositIds[j] = tempId;
            amounts[j] = apeXPool.getEsDeposit(user, tempId).amount;
        }
    }

    function getWithdrawableYields(
        address user
    ) external view returns (uint256[] memory yieldIds, uint256[] memory amounts) {
        uint256 length = apeXPool.getYieldsLength(user);
        uint256[] memory ids = new uint256[](length);
        uint256 count;
        IApeXPool.Yield memory _yield;
        for (uint256 i = 0; i < length; i++) {
            _yield = apeXPool.getYield(user, i);
            if (_yield.amount > 0 && block.timestamp > _yield.lockUntil) {
                ids[count] = i;
                count += 1;
            }
        }

        yieldIds = new uint256[](count);
        amounts = new uint256[](count);
        uint256 tempId;
        for (uint256 j = 0; j < count; j++) {
            tempId = yieldIds[j];
            yieldIds[j] = tempId;
            amounts[j] = apeXPool.getYield(user, tempId).amount;
        }
    }

    function getForceWithdrawYieldIds(address user) external view returns (uint256[] memory yieldIds) {
        uint256 length = apeXPool.getYieldsLength(user);
        uint256[] memory ids = new uint256[](length);
        uint256 count;
        IApeXPool.Yield memory _yield;
        for (uint256 i = 0; i < length; i++) {
            _yield = apeXPool.getYield(user, i);
            if (_yield.amount > 0) {
                ids[count] = i;
                count += 1;
            }
        }

        yieldIds = new uint256[](count);
        for (uint256 j = 0; j < count; j++) {
            yieldIds[j] = ids[j];
        }
    }
}
