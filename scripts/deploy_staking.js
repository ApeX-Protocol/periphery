const { ethers, upgrades } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const verifyStr = "npx hardhat verify --network";

//// ArbitrumOne
const wethAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
const apeXAddress = "0x61A1ff55C5216b636a294A07D77C6F4Df10d3B56";
const treasuryAddress = "0x73f5d8fb154d19a0C496E7411488cD455aB0373A"; // PCVTreasury address
const lpTokenAddress = "0xf466a566f6B7145D0e79b3961422B40111623Fd0"; // WETH-USDC eAMM lp
//// Testnet
// const wethAddress = "0x655e2b2244934Aea3457E3C56a7438C271778D44";
// const apeXAddress = "0x3f355c9803285248084879521AE81FF4D3185cDD";
// const treasuryAddress = "0x2225F0bEef512e0302D6C4EcE4f71c85C2312c06"; // PCVTreasury address
// const lpTokenAddress = "0x01a3eae4edd0512d7d1e3b57ecd40a1a1b1076ee"; // mWETH-mUSDC lp testnet
// const lpTokenAddress = "0xa0b52dbdb5e4b62c8f3555c047440c555773767a"; // mWETH-mUSDC lp dev

const esApeXAddr = "0xB86851c7F7C1b904A034F07Dd819382f8afD7893";
const poolContractEventAddress = "0x6B2ec59e7fDc51581d57c85d258CDA1415422214";

const stakingPoolapeXPerSec = BigNumber.from("172973201000000000");
const apexPoolapeXPerSec = BigNumber.from("21621650000000000");
const secSpanPerUpdate = 14 * 24 * 3600; //two weeks
// const initTimestamp = Math.round(new Date().getTime() / 1000);
const initTimestamp = 1656676800;
const endTimestamp = initTimestamp + 4838400;
const vestTime = 15552000;
const lockTime = 4838400;
const apeXPoolWeight = 1;
const lpPoolWeight = 1;
const remainForOtherVest = 50;
const minRemainRatioAfterBurn = 1666;

let stakingPool, apeXPool;
let esApeX, veApeX, lpPool, stakingPoolTemplate, stakingPoolFactory, rewardForStaking;

const main = async () => {
  /**
   * 部署流程
   * 1. 先执行createEsApeX()，然后修改esApexAddr
   * 2. 然后执行createPoolCreatedEvent()，然后修改poolContractEventAddress
   * 3. 想要创建ApexPool的话，执行createApexPool()
   * 4. 想要创建StakingPool的话，createStakingPool()，需要修改lpTokenAddress
   */
  // await createEsApeX();
  // await createPoolCreatedEvent();
  // await createApexPool();
  // await createStakingPool();
  // await createReward();
  await createAggregateQuery();
};

async function createEsApeX() {
  const EsAPEX = await ethers.getContractFactory("EsAPEX");
  esApeX = await EsAPEX.deploy();
  console.log("EsAPEX:", esApeX.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, esApeX.address);
}

async function createStakingPool() {
  await createPools(false, stakingPoolapeXPerSec);

  const StakingPool = await ethers.getContractFactory("StakingPool");
  stakingPool = await StakingPool.deploy();
  await stakingPool.initialize(stakingPoolFactory.address, lpTokenAddress, initTimestamp, endTimestamp);
  console.log("stakingPool:", stakingPool.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, stakingPool.address);

  await stakingPoolFactory.registerStakingPool(stakingPool.address, lpTokenAddress, lpPoolWeight);
  lpPool = await StakingPool.attach(await stakingPoolFactory.tokenPoolMap(lpTokenAddress));
  console.log("lpPool:", lpPool.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, lpPool.address);
}

async function createApexPool() {
  // await createPools(true, apexPoolapeXPerSec);
  if (stakingPoolFactory == null) {
    const StakingPoolFactory = await ethers.getContractFactory("StakingPoolFactory");
    stakingPoolFactory = await StakingPoolFactory.attach("0xeAc47669f5a1f4A63ff61F570D1BBE73E0319bE4");
  }
  const ApeXPool = await ethers.getContractFactory("ApeXPool");
  apeXPool = await ApeXPool.deploy(stakingPoolFactory.address, apeXAddress, initTimestamp, endTimestamp, vestTime);
  await stakingPoolFactory.registerApeXPool(apeXPool.address, apeXPoolWeight);
  console.log("ApeXPool:", apeXPool.address);
  console.log(
    verifyStr,
    process.env.HARDHAT_NETWORK,
    apeXPool.address,
    stakingPoolFactory.address,
    apeXAddress,
    initTimestamp,
    endTimestamp,
    vestTime
  );

  const VeAPEX = await ethers.getContractFactory("VeAPEX");
  veApeX = await VeAPEX.deploy(stakingPoolFactory.address);
  console.log("VeAPEX:", veApeX.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, veApeX.address, stakingPoolFactory.address);

  await stakingPoolFactory.setVeApeX(veApeX.address);
}

async function createPoolCreatedEvent() {
  const PoolCreateEvent = await ethers.getContractFactory("PoolCreateEvent");
  const poolCreatedEvent = await PoolCreateEvent.deploy();
  console.log(verifyStr, process.env.HARDHAT_NETWORK, poolCreatedEvent.address);
}

async function createPools(isApexPool, apeXPerSec) {
  const StakingPoolFactory = await ethers.getContractFactory("StakingPoolFactory");
  const StakingPool = await ethers.getContractFactory("StakingPool");

  // stakingPoolTemplate = await StakingPool.deploy();
  // console.log("stakingPoolTemplate:", stakingPoolTemplate.address);
  // console.log(verifyStr, process.env.HARDHAT_NETWORK, stakingPoolTemplate.address);

  stakingPoolFactory = await StakingPoolFactory.deploy();
  await stakingPoolFactory.initialize(
    apeXAddress,
    treasuryAddress,
    apeXPerSec,
    secSpanPerUpdate,
    initTimestamp,
    endTimestamp,
    lockTime
  );
  console.log("StakingPoolFactory:", stakingPoolFactory.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, stakingPoolFactory.address);

  const PoolCreateEvent = await ethers.getContractFactory("PoolCreateEvent");
  const poolCreateEvent = await PoolCreateEvent.attach(poolContractEventAddress);
  await poolCreateEvent.PoolCreate(stakingPoolFactory.address, isApexPool, initTimestamp, endTimestamp);

  // const EsAPEX = await ethers.getContractFactory("EsAPEX");
  // const esAPEX = await EsAPEX.attach(esApeXAddr);
  // await esAPEX.addOperator(stakingPoolFactory.address);

  // stakingPoolFactory = await upgrades.deployProxy(StakingPoolFactory, [
  //   apeXAddress,
  //   treasuryAddress,
  //   apeXPerSec,
  //   secSpanPerUpdate,
  //   initTimestamp,
  //   endTimestamp,
  //   sixMonth,
  // ]);
  // console.log("StakingPoolFactory:", stakingPoolFactory.address);

  await stakingPoolFactory.setRemainForOtherVest(remainForOtherVest);
  await stakingPoolFactory.setMinRemainRatioAfterBurn(minRemainRatioAfterBurn);
  await stakingPoolFactory.setEsApeX(esApeXAddr);
  // await stakingPoolFactory.setStakingPoolTemplate(stakingPoolTemplate.address);
}

async function createReward() {
  const RewardForStaking = await ethers.getContractFactory("RewardForStaking");
  rewardForStaking = await RewardForStaking.deploy(wethAddress);
  console.log("RewardForStaking:", rewardForStaking.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, rewardForStaking.address, wethAddress);
}

async function createAggregateQuery() {
  const AggregateQuery = await ethers.getContractFactory("AggregateQuery");
  const aggregateQuery = await AggregateQuery.deploy();
  console.log("AggregateQuery:", aggregateQuery.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, aggregateQuery.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
