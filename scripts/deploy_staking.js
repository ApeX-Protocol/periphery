const { ethers } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const verifyStr = "npx hardhat verify --network";

//// ArbitrumOne
// const wethAddress = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
// const apeXAddress = "0x3f355c9803285248084879521AE81FF4D3185cDD";
// const treasuryAddress = ""; // PCVTreasury address
// const lpTokenAddress = ""; // WETH-USDC eAMM lp
//// Testnet
const wethAddress = "0x655e2b2244934Aea3457E3C56a7438C271778D44";
const apeXAddress = "0x3f355c9803285248084879521AE81FF4D3185cDD";
const treasuryAddress = "0x2225F0bEef512e0302D6C4EcE4f71c85C2312c06"; // PCVTreasury address
const lpTokenAddress = "0x01a3eae4edd0512d7d1e3b57ecd40a1a1b1076ee"; // mWETH-mUSDC lp

const esApeXAddr = "0x42C2522E249136925E1d4955e73344a221fcf8DF";
const poolContractEventAddress = "0xee2De30D18A6FF97A41B90bcedb6941DDb6D3a6a";

const stakingPoolApeXPerSec = BigNumber.from("364090160000000000");
const apeXPoolApeXPerSec = BigNumber.from("45511270000000000");
const secSpanPerUpdate = 14 * 24 * 3600; //two weeks
// const initTimestamp = Math.round(new Date().getTime() / 1000);
const initTimestamp = 1654826400;
const endTimestamp = initTimestamp + 26 * 7 * 24 * 3600; // 6 month
const lockTime = 26 * 7 * 24 * 3600;
const apeXPoolWeight = 21;
const lpPoolWeight = 79;
const remainForOtherVest = 50;
const minRemainRatioAfterBurn = 6000;

let poolCreateEvent;
let esApeX, veApeX, apeXPool, lpPool, stakingPoolTemplate, stakingPoolFactory, rewardForStaking;

const main = async () => {
  /**
   * 部署流程
   * 1. 先执行createEsApeX()，然后修改esApexAddr
   * 2. 然后执行createPoolCreatedEvent()，然后修改poolContractEventAddress
   * 3. 想要创建ApexPool的话，执行createApexPool()
   * 4. 想要创建StakingPool的话，createStakingPool()，需要修改lpTokenAddress
   */
  await createEsApeX();
  await createPoolCreateEvent();
  await createApeXPool();
  await createStakingPool();
  // await createReward();
};

async function createEsApeX() {
  const EsAPEX = await ethers.getContractFactory("EsAPEX");
  esApeX = await EsAPEX.deploy();
  console.log("EsAPEX:", esApeX.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, esApeX.address);
}

async function createPoolCreateEvent() {
  const PoolCreateEvent = await ethers.getContractFactory("PoolCreateEvent");
  poolCreateEvent = await PoolCreateEvent.deploy();
  console.log("PoolCreateEvent:", poolCreateEvent.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, poolCreateEvent.address);
}

async function createApeXPool() {
  await createPools(true, apeXPoolApeXPerSec);
  const ApeXPool = await ethers.getContractFactory("ApeXPool");
  apeXPool = await ApeXPool.deploy(stakingPoolFactory.address, apeXAddress, initTimestamp, endTimestamp);
  await stakingPoolFactory.registerApeXPool(apeXPool.address, apeXPoolWeight);
  console.log("ApeXPool:", apeXPool.address);
  console.log(
    verifyStr,
    process.env.HARDHAT_NETWORK,
    apeXPool.address,
    stakingPoolFactory.address,
    apeXAddress,
    initTimestamp,
    endTimestamp
  );

  const VeAPEX = await ethers.getContractFactory("VeAPEX");
  veApeX = await VeAPEX.deploy(stakingPoolFactory.address);
  console.log("VeAPEX:", veApeX.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, veApeX.address, stakingPoolFactory.address);

  await stakingPoolFactory.setVeApeX(veApeX.address);
}

async function createStakingPool() {
  await createPools(false, stakingPoolApeXPerSec);
  await stakingPoolFactory.createPool(lpTokenAddress, lpPoolWeight);
  const StakingPool = await ethers.getContractFactory("StakingPool");
  lpPool = await StakingPool.attach(await stakingPoolFactory.tokenPoolMap(lpTokenAddress));
  console.log("lpPool:", lpPool.address);
}

async function createPools(isApexPool, apeXPerSec) {
  const StakingPoolFactory = await ethers.getContractFactory("StakingPoolFactory");
  const StakingPool = await ethers.getContractFactory("StakingPool");

  stakingPoolTemplate = await StakingPool.deploy();
  console.log("stakingPoolTemplate:", stakingPoolTemplate.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, stakingPoolTemplate.address);

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

  // const PoolCreateEvent = await ethers.getContractFactory("PoolCreateEvent");
  // let poolCreateEvent = await PoolCreateEvent.attach(poolContractEventAddress);
  await poolCreateEvent.PoolCreate(stakingPoolFactory.address, isApexPool, initTimestamp, endTimestamp);

  // const EsAPEX = await ethers.getContractFactory("EsAPEX");
  // const esAPEX = await EsAPEX.attach(esApeXAddr);
  await esApeX.addOperator(stakingPoolFactory.address);

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
  await stakingPoolFactory.setStakingPoolTemplate(stakingPoolTemplate.address);
}

async function createReward() {
  const RewardForStaking = await ethers.getContractFactory("RewardForStaking");
  rewardForStaking = await RewardForStaking.deploy(wethAddress);
  console.log("RewardForStaking:", rewardForStaking.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, rewardForStaking.address, wethAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
