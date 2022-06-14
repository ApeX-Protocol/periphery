const { ethers, upgrades } = require("hardhat");
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
const STEmUSDClpTokenAddress = "0xa8cd3de0696ef05efd4f06492e14131c5a0a8aff"; // STE-mUSDC lp

const esApeXAddr = "0x3b7621f8e6007478aE54A33466261D848c1Fb778";
const poolContractEventAddress = "0xd53F45E5b83a80541d1C29D4186E302980A9A4A3";
const STEmUSDCpoolContractEventAddress = "0xa8cd3de0696ef05efd4f06492e14131c5a0a8aff";
const mWETHmUSDCpoolContractEventAddress = "0xa0b52dbdb5e4b62c8f3555c047440c555773767a";

// 0.04551127 * 1e18
// const apeXPerSec = BigNumber.from("82028346620490110");
const apeXPerSec = BigNumber.from("364090160000000000");
const secSpanPerUpdate = 14 * 24 * 3600; //two weeks
// const initTimestamp = Math.round(new Date().getTime() / 1000);
const initTimestamp = 1654826400;
const endTimestamp = initTimestamp + 26 * 7 * 24 * 3600; // 6 month
const lockTime = 26 * 7 * 24 * 3600;
const apeXPoolWeight = 21;
const lpPoolWeight = 79;
const remainForOtherVest = 50;
const minRemainRatioAfterBurn = 6000;

let esApeX, veApeX, apeXPool, lpPool, stakingPoolTemplate, stakingPoolFactory, rewardForStaking;

const main = async () => {
  /**
   * 部署流程
   * 1. 先执行createEsApeX()，然后修改esApexAddr
   * 2. 然后执行createPoolCreatedEvent()，然后修改poolContractEventAddress
   * 3. 想要创建ApexPool的话，执行createApexPool()
   * 4. 想要创建StakingPool的话，createStakingPool()，需要修改lpTokenAddress
   */
  // await createEsApeX();
  await createPoolCreatedEvent();
  // await createApexPool();
  await createStakingPool();
  // await createReward();
};

async function createEsApeX() {
  const EsAPEX = await ethers.getContractFactory("EsAPEX");
  esApeX = await EsAPEX.deploy();
  console.log("EsAPEX:", esApeX.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, esApeX.address);
}

async function createStakingPool() {
  await createPools(false);
  await stakingPoolFactory.createPool(mWETHmUSDCpoolContractEventAddress, lpPoolWeight);
  const StakingPool = await ethers.getContractFactory("StakingPool");
  lpPool = StakingPool.attach(await stakingPoolFactory.tokenPoolMap(lpTokenAddress));
  console.log("lpPool:", lpPool.address);
}

async function createApexPool() {
  await createPools(true);
  const ApeXPool = await ethers.getContractFactory("ApeXPool");
  apeXPool = await ApeXPool.deploy(stakingPoolFactory.address, apeXAddress);
  await stakingPoolFactory.registerApeXPool(apeXPool.address, apeXPoolWeight);
  console.log("ApeXPool:", apeXPool.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, apeXPool.address, stakingPoolFactory.address, apeXAddress);

  const VeAPEX = await ethers.getContractFactory("VeAPEX");
  veApeX = await VeAPEX.deploy(stakingPoolFactory.address);
  console.log("VeAPEX:", veApeX.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, veApeX.address, stakingPoolFactory.address);

  await stakingPoolFactory.setVeApeX(veApeX.address);
}

async function createPoolCreatedEvent() {
  const PoolCreateEvent = await ethers.getContractFactory("PoolCreateEvent");
  const poolCreatedEvent = await PoolCreateEvent.deploy();
  console.log("PoolCreateEvent:", poolCreatedEvent.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, poolCreatedEvent.address);
}

async function createPools(isApexPool) {
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

  const PoolCreateEvent = await ethers.getContractFactory("PoolCreateEvent");
  const poolCreateEvent = await PoolCreateEvent.attach(poolContractEventAddress);
  await poolCreateEvent.PoolCreate(stakingPoolFactory.address, isApexPool);

  const EsAPEX = await ethers.getContractFactory("EsAPEX");
  const esAPEX = await EsAPEX.attach(esApeXAddr);
  await esAPEX.addOperator(stakingPoolFactory.address);

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
