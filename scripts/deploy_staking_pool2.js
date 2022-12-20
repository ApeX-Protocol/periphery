const { ethers, upgrades } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const verifyStr = "npx hardhat verify --network";

const main = async () => {
  const owner = "0x1956b2c4C511FDDd9443f50b36C4597D10cD9985";
  const stakeToken = "0xe88695604729Fc015ff43a1C0a3c642665B95583";
  const rewardToken = "0x39d3a0F25D94D9c13E552b9E81eF9b03550A9783";
  const rewardPerSecond = BigNumber.from("1000000000000000000");
  const endTime = 1671840000;
  const minPeriod = 3600;

  const StakingPool = await ethers.getContractFactory("StakingPool2");
  let stakingPool = await StakingPool.deploy();
  console.log("StakingPool:", stakingPool.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, stakingPool.address);

  await stakingPool.initialize(owner, stakeToken, rewardToken, rewardPerSecond, endTime, minPeriod);
  console.log("initialize success");
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
