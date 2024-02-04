const { ethers } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const verifyStr = "npx hardhat verify --network";

const main = async () => {
  const owner = "0xf73546Da2F971bD0Ed1b3c5F9C01092180Db5089";
  const apeXToken = "0x96630b0D78d29E7E8d87f8703dE7c14b2d5AE413";
  const treasury = "0xf73546Da2F971bD0Ed1b3c5F9C01092180Db5089";
  const vestTime = 180 * 24 * 3600;
  const forceWithdrawMinRemainRatio = 1666;
  
  const EsAPEX2 = await ethers.getContractFactory("EsAPEX2");
  const esApeX2 = await EsAPEX2.deploy(owner, apeXToken, treasury, vestTime, forceWithdrawMinRemainRatio);
  console.log("EsAPEX:", esApeX2.address);
  console.log(
    verifyStr,
    process.env.HARDHAT_NETWORK,
    esApeX2.address,
    owner,
    apeXToken,
    treasury,
    vestTime,
    forceWithdrawMinRemainRatio
  );
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
