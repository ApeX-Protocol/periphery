import { BigNumber } from "@ethersproject/bignumber";
import bn from "bignumber.js";
const hre = require("hardhat");
const ethers = hre.ethers;

const bigZero = BigNumber.from(0);

function sqrt(value: BigNumber): BigNumber {
  return BigNumber.from(
    new bn(value.toString()).sqrt().toFixed().split(".")[0]
  );
}

function computeC(
  tokenAStart: BigNumber,
  tokenBStart: BigNumber,
  tokenAIn: BigNumber,
  tokenBIn: BigNumber
): BigNumber {
  let c1 = sqrt(tokenAStart).mul(sqrt(tokenBIn));
  let c2 = sqrt(tokenBStart).mul(sqrt(tokenAIn));
  let cNumerator = c1.sub(c2);
  let cDenominator = c1.add(c2);
  let c = cNumerator.div(cDenominator);
  return c;
}

function computeAmmEndTokenA(
  tokenAIn: BigNumber,
  tokenBIn: BigNumber,
  c: BigNumber,
  k: BigNumber,
  tokenAStart: BigNumber,
  tokenBStart: BigNumber
): BigNumber {
  let eNumerator = sqrt(tokenAIn.mul(4)).mul(sqrt(tokenBIn));
  let eDenominator = sqrt(tokenAStart).mul(sqrt(tokenBStart));
  let exponent = BigNumber.from(Math.exp(eNumerator.div(eDenominator).toNumber()));
  let fraction = exponent.add(c).div(exponent.sub(c));
  let scaling = sqrt(k.div(tokenBIn)).mul(sqrt(tokenAIn));
  let ammEndTokenA = fraction.mul(scaling);
  return ammEndTokenA;
}
function computeVirtualBalances(
  tokenAStart: BigNumber,
  tokenBStart: BigNumber,
  tokenAIn: BigNumber,
  tokenBIn: BigNumber
): [BigNumber, BigNumber, BigNumber, BigNumber] {
  let tokenAOut: BigNumber;
  let tokenBOut: BigNumber;
  let ammEndTokenA: BigNumber;
  let ammEndTokenB: BigNumber;
  //if no tokens are sold to the pool, we don't need to execute any orders
  if (tokenAIn.isZero() && tokenBIn.isZero()) {
    tokenAOut = bigZero;
    tokenBOut = bigZero;
    ammEndTokenA = tokenAStart;
    ammEndTokenB = tokenBStart;
  }
  //in the case where only one pool is selling, we just perform a normal swap
  else if (tokenAIn.isZero()) {
    //constant product formula
    tokenAOut = tokenAStart.mul(tokenBIn).div(tokenBStart.add(tokenBIn));
    tokenBOut = bigZero;
    ammEndTokenA = tokenAStart.sub(tokenAOut);
    ammEndTokenB = tokenBStart.add(tokenBIn);
  } else if (tokenBIn.isZero()) {
    tokenAOut = bigZero;
    //constant product formula
    tokenBOut = tokenBStart.mul(tokenAIn).div(tokenAStart.add(tokenAIn));
    ammEndTokenA = tokenAStart.add(tokenAIn);
    ammEndTokenB = tokenBStart.sub(tokenBOut);
  }
  //when both pools sell, we use the TWAMM formula
  else {
    let k = tokenAStart.mul(tokenBStart);
    let c = computeC(tokenAStart, tokenBStart, tokenAIn, tokenBIn);
    ammEndTokenA = computeAmmEndTokenA(
      tokenAIn,
      tokenBIn,
      c,
      k,
      tokenAStart,
      tokenBStart
    );
    ammEndTokenB = tokenAStart.mul(tokenBStart).div(ammEndTokenA);
    tokenAOut = tokenAStart.add(tokenAIn).sub(ammEndTokenA);
    tokenBOut = tokenBStart.add(tokenBIn).sub(ammEndTokenB);
    // require("tokenAOut.gte(bigZero) && tokenBOut.gte(bigZero)");
  }
  return [tokenAOut, tokenBOut, ammEndTokenA, ammEndTokenB];
}

async function executeVirtualOrders(
  blockNumber: number
): Promise<
  [BigNumber, BigNumber, number, BigNumber, BigNumber, BigNumber, BigNumber]
> {
  // const token0Addr = "0xb0751fACbCcF598787c351Ce9541a4b203504c41";
  // const token1Addr = "0x419E14a156daA5159ad73D36313E3520ff2a3F57";
    const token0Addr = "0x6DDFEb84c9e9E9681f2B9AbbD0726d834f0305c6";
   const token1Addr = "0x39659143A719A1D2bCd57E76e58c901f72E5f20B";
  
  // // loading necessary contracts
  const TWAMMAddr = "0xFe2E5fCe86495560574270f1F97a5ce9f534Cf94";
  const twamm = await ethers.getContractAt("ITWAMM", TWAMMAddr);

  const pairAddr = await twamm.obtainPairAddress(token0Addr, token1Addr);
  console.log("pair address check", pairAddr);
  let pair = await ethers.getContractAt("IPair", pairAddr);

  //variables
  let orderBlockInterval = 5;
  let i;

  let reserveA: BigNumber;
  let reserveB: BigNumber;

  let lastVirtualOrderBlock: number;
  let currentSalesRateA: BigNumber;
  let currentSalesRateB: BigNumber;
  let rewardFactorA: BigNumber;
  let rewardFactorB: BigNumber;

  //get the variable value through the view function
  reserveA = await pair.tokenAReserves();
  reserveB = await pair.tokenBReserves();
  [
    lastVirtualOrderBlock,
    currentSalesRateA,
    currentSalesRateB,
    rewardFactorA,
    rewardFactorB,
  ] = await pair.getTWAMMState();

  //execute virtual order settlement to blockNumber
  let lastExpiryBlock =
    lastVirtualOrderBlock - (lastVirtualOrderBlock % orderBlockInterval);
  let n = (blockNumber - lastExpiryBlock) % orderBlockInterval;

  if (n >= 1) {
    for (i = 1; i <= n; i++) {
      let iExpiryBlock = lastExpiryBlock + i * orderBlockInterval;
      let [iOrderPoolASalesRateEnding, iOrderPoolBSalesRateEnding] =
        await pair.getTWAMMSalesRateEnding(iExpiryBlock);

      if (
        iOrderPoolASalesRateEnding.gt(bigZero) ||
        iOrderPoolASalesRateEnding.gt(bigZero)
      ) {
        //amount sold from virtual trades
        let blockNumberIncrement = iExpiryBlock - lastVirtualOrderBlock;
        let tokenASellAmount = currentSalesRateA.mul(blockNumberIncrement);
        let tokenBSellAmount = currentSalesRateB.mul(blockNumberIncrement);

        let tokenAOut: BigNumber;
        let tokenBOut: BigNumber;
        let ammEndTokenA: BigNumber;
        let ammEndTokenB: BigNumber;

        //updated balances from sales
        [tokenAOut, tokenBOut, ammEndTokenA, ammEndTokenB] =
          computeVirtualBalances(
            reserveA,
            reserveB,
            tokenASellAmount,
            tokenBSellAmount
          );

        if (!currentSalesRateA.eq(0)) {
          rewardFactorA = rewardFactorA.add(tokenBOut.div(currentSalesRateA));
        }
        if (!currentSalesRateB.eq(0)) {
          rewardFactorB = rewardFactorB.add(tokenAOut.div(currentSalesRateB));
        }

        //update state
        reserveA = ammEndTokenA;
        reserveB = ammEndTokenB;

        lastVirtualOrderBlock = iExpiryBlock;
        currentSalesRateA = currentSalesRateA.sub(iOrderPoolASalesRateEnding);
        currentSalesRateB = currentSalesRateB.sub(iOrderPoolBSalesRateEnding);
      }
      //finally, move state to blockNumber if necessary
      let [endOrderPoolASalesRateEnding, endOrderPoolBSalesRateEnding] =
        await pair.getTWAMMSalesRateEnding(blockNumber);
      let blockNumberIncrement = blockNumber - lastVirtualOrderBlock;
      let tokenASellAmount = currentSalesRateA.mul(blockNumberIncrement);
      let tokenBSellAmount = currentSalesRateB.mul(blockNumberIncrement);

      let tokenAOut: BigNumber;
      let tokenBOut: BigNumber;
      let ammEndTokenA: BigNumber;
      let ammEndTokenB: BigNumber;

      [tokenAOut, tokenBOut, ammEndTokenA, ammEndTokenB] =
        computeVirtualBalances(
          reserveA,
          reserveB,
          tokenASellAmount,
          tokenBSellAmount
        );

      if (!currentSalesRateA.eq(0)) {
        rewardFactorA = rewardFactorA.add(tokenBOut.div(currentSalesRateA));
      }
      if (!currentSalesRateB.eq(0)) {
        rewardFactorB = rewardFactorB.add(tokenAOut.div(currentSalesRateB));
      }

      //update state
      reserveA = ammEndTokenA;
      reserveB = ammEndTokenB;

      lastVirtualOrderBlock = blockNumber;
      currentSalesRateA = currentSalesRateA.sub(endOrderPoolASalesRateEnding);
      currentSalesRateB = currentSalesRateB.sub(endOrderPoolBSalesRateEnding);
    }
  } else {
    let [endOrderPoolASalesRateEnding, endOrderPoolBSalesRateEnding] =
      await pair.getTWAMMSalesRateEnding(blockNumber);
    let blockNumberIncrement = blockNumber - lastVirtualOrderBlock;
    let tokenASellAmount = currentSalesRateA.mul(blockNumberIncrement);
    let tokenBSellAmount = currentSalesRateB.mul(blockNumberIncrement);

    let tokenAOut: BigNumber;
    let tokenBOut: BigNumber;
    let ammEndTokenA: BigNumber;
    let ammEndTokenB: BigNumber;

    [tokenAOut, tokenBOut, ammEndTokenA, ammEndTokenB] = computeVirtualBalances(
      reserveA,
      reserveB,
      tokenASellAmount,
      tokenBSellAmount
    );

    if (!currentSalesRateA.eq(0)) {
      rewardFactorA = rewardFactorA.add(tokenBOut.div(currentSalesRateA));
    }
    if (!currentSalesRateB.eq(0)) {
      rewardFactorB = rewardFactorB.add(tokenAOut.div(currentSalesRateB));
    }

    //update state
    reserveA = ammEndTokenA;
    reserveB = ammEndTokenB;

    lastVirtualOrderBlock = blockNumber;
    currentSalesRateA = currentSalesRateA.sub(endOrderPoolASalesRateEnding);
    currentSalesRateB = currentSalesRateB.sub(endOrderPoolBSalesRateEnding);
  }
  return [
    reserveA,
    reserveB,
    lastVirtualOrderBlock,
    currentSalesRateA,
    currentSalesRateB,
    rewardFactorA,
    rewardFactorB,
  ];
}

export default executeVirtualOrders;
