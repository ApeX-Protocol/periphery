// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "../interfaces/IERC20.sol";
import "./interfaces/IBanana.sol";
import "./interfaces/IBananaDistributor.sol";
import "./interfaces/ITWAMM.sol";
import "./interfaces/ITWAMMTermSwap.sol";
import "../utils/Ownable.sol";
import "../utils/AnalyticMath.sol";
import "../libraries/FullMath.sol";

contract BuybackPool is Ownable, AnalyticMath {
    using FullMath for uint256;

    address public banana;
    address public usdc;
    address public twamm;
    address public twammTermSwap;
    address public bananaDistributor;

    uint256 public lastBuyingRate;
    uint256 public priceT1;
    uint256 public priceT2;
    uint256 public rewardT1;
    uint256 public rewardT2;
    uint256 public priceIndex = 100;
    uint256 public rewardIndex = 50;
    uint256 public secondsPerBlock = 12;
    uint256 public intervalBlocks = 50400; // total blocks in one week, 7*24*3600/12
    uint256 public lastOrderId;
    uint256 public lastExecuteBlock;
    
    bool public isStop;

    constructor(
        address banana_, 
        address usdc_,
        address twamm_,
        address twammTermSwap_,
        address bananaDistributor_,
        uint256 initBuyingRate
    ) {
        owner = msg.sender;
        banana = banana_;
        usdc = usdc_;
        twamm = twamm_;
        twammTermSwap = twammTermSwap_;
        bananaDistributor = bananaDistributor_;
        lastBuyingRate = initBuyingRate;
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

    function updateIntervalBlocks(uint256 newIntervalBlocks) external onlyOwner {
        intervalBlocks = newIntervalBlocks;
    }

    function updateStatus(bool isStop_) external onlyOwner {
        isStop = isStop_;
    }

    function execute() external {
        require(!isStop, "is stop");
        if (lastExecuteBlock == 0) {
            lastExecuteBlock = block.number;
        } else {
            lastExecuteBlock = lastExecuteBlock + intervalBlocks;
        }

        require(block.number > lastExecuteBlock, "not reach execute block");
        
        ITWAMMTermSwap swap = ITWAMMTermSwap(twammTermSwap);
        if (lastOrderId > 0) {
            swap.withdrawProceedsFromTermSwapTokenToToken(usdc, banana, lastOrderId, block.timestamp);
        }
        
        if (priceT1 > 0 && priceT2 > 0 && rewardT1 > 0 && rewardT2 > 0) {
            (uint256 pn, uint256 pd) = pow(priceT2, priceT1, priceIndex, 100);
            (uint256 rn, uint256 rd) = pow(rewardT1, rewardT2, rewardIndex, 100);
            lastBuyingRate = lastBuyingRate.mulDiv(pn, pd).mulDiv(rn, rd);
        } 
        
        uint256 amountIn = intervalBlocks * lastBuyingRate * secondsPerBlock;
        uint256 usdcBalance = IERC20(usdc).balanceOf(address(this));
        if (amountIn > usdcBalance) {
            amountIn = usdcBalance;
        }
        require(amountIn > 0, "buying amount is 0");
        IERC20(usdc).approve(address(swap), amountIn);
        lastOrderId = swap.longTermSwapTokenToToken(usdc, banana, amountIn, intervalBlocks, block.timestamp);
        
        uint256 lastReward = IBananaDistributor(bananaDistributor).lastReward();
        rewardT2 = rewardT1;
        rewardT1 = lastReward;

        (uint256 reserve0, uint256 reserve1) = ITWAMM(twamm).obtainReserves(usdc, banana);
        uint256 currentPrice = reserve0.mulDiv(1e18, reserve1);
        priceT2 = priceT1;
        priceT1 = currentPrice;
    }
}