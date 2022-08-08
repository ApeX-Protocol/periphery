import { BigNumber } from "@ethersproject/bignumber";
import executeVirtualOrders from "./twamm-execute";

const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const [account] = await ethers.getSigners();
  console.log("Account Address:", await account.getAddress());
  console.log("Account balance:", (await account.getBalance()).toString());

  let currentBlockNumber = await ethers.provider.getBlockNumber();
  console.log("current block number", currentBlockNumber);

  let reserveA: BigNumber;
  let reserveB: BigNumber;

  let lastVirtualOrderBlock: number;
  let currentSalesRateA: BigNumber;
  let currentSalesRateB: BigNumber;
  let rewardFactorA: BigNumber;
  let rewardFactorB: BigNumber;

  [
    reserveA,
    reserveB,
    lastVirtualOrderBlock,
    currentSalesRateA,
    currentSalesRateB,
    rewardFactorA,
    rewardFactorB,
  ] = await executeVirtualOrders(currentBlockNumber);

  console.log("reserveA", reserveA);
  console.log("reserveB", reserveB);
  console.log("price:", reserveB.mul(1000).div(reserveA))
  console.log("lastVirtualOrderBlock", lastVirtualOrderBlock);
  console.log("currentSalesRateA", currentSalesRateA);
  console.log("currentSalesRateB", currentSalesRateB);
  // console.log("rewardFactorA", rewardFactorA);
  // console.log("rewardFactorB", rewardFactorB);

  [
    reserveA,
    reserveB,
    lastVirtualOrderBlock,
    currentSalesRateA,
    currentSalesRateB,
    rewardFactorA,
    rewardFactorB,
  ] = await executeVirtualOrders(currentBlockNumber+10);
  console.log('future check')
  console.log("reserveA", reserveA);
  console.log("reserveB", reserveB);
  console.log("price:", reserveB.mul(1000).div(reserveA))
  console.log("lastVirtualOrderBlock", lastVirtualOrderBlock);
  console.log("currentSalesRateA", currentSalesRateA);
  console.log("currentSalesRateB", currentSalesRateB);
  // console.log("rewardFactorA", rewardFactorA);
  // console.log("rewardFactorB", rewardFactorB);
}



main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
