// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "../interfaces/IERC20.sol";
import "./interfaces/IBanana.sol";
import "./interfaces/IBananaDistributor.sol";
import "./interfaces/ITWAMM.sol";
import "./interfaces/ITWAMMPair.sol";
import "../utils/Ownable.sol";
import "../utils/AnalyticMath.sol";
import "../libraries/FullMath.sol";
import "../libraries/TransferHelper.sol";

contract BuybackPool is Ownable, AnalyticMath {
    using FullMath for uint256;

    address public banana;
    address public usdc;
    address public twamm;
    address public bananaDistributor;
    address public keeper;

    uint256 public lastBuyingRate;
    uint256 public priceT1;
    uint256 public priceT2;
    uint256 public rewardT1;
    uint256 public rewardT2;
    uint256 public priceIndex = 100;
    uint256 public rewardIndex = 50;
    uint256 public secondsPerBlock = 12;
    uint256 public secondsOfEpoch;
    uint256 public lastOrderId;
    uint256 public lastExecuteTime;
    
    bool public initialized;
    bool public isStop;

    constructor(
        address banana_, 
        address usdc_,
        address twamm_,
        address bananaDistributor_,
        address keeper_,
        uint256 secondsOfEpoch_,
        uint256 initPrice,
        uint256 initReward,
        uint256 startTime
    ) {
        owner = msg.sender;
        banana = banana_;
        usdc = usdc_;
        twamm = twamm_;
        bananaDistributor = bananaDistributor_;
        keeper = keeper_;
        secondsOfEpoch = secondsOfEpoch_;
        priceT2 = initPrice;
        rewardT2 = initReward;
        lastExecuteTime = startTime;
    }

    function initBuyingRate(uint256 amountIn, uint256 secondsOfBuffer) external onlyOwner {
        require(!initialized, "already initialized");
        initialized = true;
        uint256 intervalBlocks = (lastExecuteTime + secondsOfEpoch - secondsOfBuffer) / secondsPerBlock;
        lastBuyingRate = amountIn / intervalBlocks / secondsPerBlock;
    }

    function updatePriceIndex(uint256 newPriceIndex) external onlyOwner {
        priceIndex = newPriceIndex;
    }

    function updateRewardIndex(uint256 newRewardIndex) external onlyOwner {
        rewardIndex = newRewardIndex;
    }

    function updateSecondsPerBlock(uint256 newSecondsPerBlock) external onlyOwner {
        secondsPerBlock = newSecondsPerBlock;
    }

    function updateSecondsOfEpoch(uint256 newSecondsOfEpoch) external onlyOwner {
        secondsOfEpoch = newSecondsOfEpoch;
    }

    function updateStatus(bool isStop_) external onlyOwner {
        isStop = isStop_;
    }

    function updateKeeper(address keeper_) external onlyOwner {
        keeper = keeper_;
    }

    function withdraw(address to) external onlyOwner {
        require(isStop, "not stop");
        address pair = ITWAMM(twamm).obtainPairAddress(usdc, banana);
        ITWAMMPair.Order memory order = ITWAMMPair(pair).getOrderDetails(lastOrderId);
        require(block.number > order.expirationBlock, "not reach withdrawable block");
        ITWAMM(twamm).withdrawProceedsFromTermSwapTokenToToken(usdc, banana, lastOrderId, block.timestamp);
        uint256 bananaBalance = IERC20(banana).balanceOf(address(this));
        IBanana(banana).burn(address(this), bananaBalance);

        uint256 usdcBalance = IERC20(usdc).balanceOf(address(this));
        TransferHelper.safeTransfer(usdc, to, usdcBalance);
    }

    function execute() external {
        require(initialized, "uninitialized");
        require(!isStop, "is stop");
        require(msg.sender == keeper, "only keeper");
        lastExecuteTime = lastExecuteTime + secondsOfEpoch;
        require(block.timestamp >= lastExecuteTime, "not reach execute time");
        
        if (lastOrderId > 0) {
            address pair = ITWAMM(twamm).obtainPairAddress(usdc, banana);
            ITWAMMPair.Order memory order = ITWAMMPair(pair).getOrderDetails(lastOrderId);
            require(block.number > order.expirationBlock, "not reach withdrawable block");

            ITWAMM(twamm).withdrawProceedsFromTermSwapTokenToToken(usdc, banana, lastOrderId, block.timestamp);
            uint256 bananaBalance = IERC20(banana).balanceOf(address(this));
            IBanana(banana).burn(address(this), bananaBalance);
        }
        
        if (priceT1 > 0 && priceT2 > 0 && rewardT1 > 0 && rewardT2 > 0) {
            (uint256 pn, uint256 pd) = pow(priceT2, priceT1, priceIndex, 100);
            (uint256 rn, uint256 rd) = pow(rewardT1, rewardT2, rewardIndex, 100);
            lastBuyingRate = lastBuyingRate.mulDiv(pn, pd).mulDiv(rn, rd);
        } 
        
        require(lastExecuteTime + secondsOfEpoch > block.timestamp, "over next opech time");
        uint256 intervalBlocks = (lastExecuteTime + secondsOfEpoch - block.timestamp) / secondsPerBlock;
        uint256 amountIn = intervalBlocks * lastBuyingRate * secondsPerBlock;
        uint256 usdcBalance = IERC20(usdc).balanceOf(address(this));
        if (amountIn > usdcBalance) {
            amountIn = usdcBalance;
            lastBuyingRate = amountIn / intervalBlocks / secondsPerBlock;
        }
        require(amountIn > 0, "buying amount is 0");
        IERC20(usdc).approve(twamm, amountIn);
        lastOrderId = ITWAMM(twamm).longTermSwapTokenToToken(usdc, banana, amountIn, intervalBlocks / 5, block.timestamp);
        
        uint256 lastReward = IBananaDistributor(bananaDistributor).lastReward();
        rewardT2 = rewardT1;
        rewardT1 = lastReward;

        (uint256 reserve0, uint256 reserve1) = ITWAMM(twamm).obtainReserves(usdc, banana);
        uint256 currentPrice = reserve0.mulDiv(1e18, reserve1);
        priceT2 = priceT1;
        priceT1 = currentPrice;
    }
}