const { ethers, upgrades } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const verifyStr = "npx hardhat verify --network";

const main = async () => {
  const lpPool = "0x62856D438f16561B331A06AFb646c4751883dd6E";
  const apeXPool = "0x1BC47Bc25Ef2e6439b50D44585264493C861c12C";

  const StakingQuery = await ethers.getContractFactory("StakingQuery");
  let stakingQuery = await StakingQuery.deploy(lpPool, apeXPool);
  console.log("StakingQuery:", stakingQuery.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, stakingQuery.address, lpPool, apeXPool);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
