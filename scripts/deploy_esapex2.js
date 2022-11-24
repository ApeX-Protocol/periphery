const { ethers } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const verifyStr = "npx hardhat verify --network";

const main = async () => {
  //   const owner = "0x1956b2c4C511FDDd9443f50b36C4597D10cD9985";
  const apeXToken = "0xEBb0882632e06cbe8070296F7e4E638639f89068";
  const treasury = "0x1956b2c4C511FDDd9443f50b36C4597D10cD9985";
  const vestTime = 24 * 3600;
  const forceWithdrawMinRemainRatio = 1666;

  let owner;
  [owner] = await ethers.getSigners();
  const EsAPEX2 = await ethers.getContractFactory("EsAPEX2");
  const esApeX2 = await EsAPEX2.deploy(owner.address, apeXToken, treasury, vestTime, forceWithdrawMinRemainRatio);
  console.log("EsAPEX:", esApeX2.address);
  console.log(
    verifyStr,
    process.env.HARDHAT_NETWORK,
    esApeX2.address,
    owner.address,
    apeXToken,
    treasury,
    vestTime,
    forceWithdrawMinRemainRatio
  );

  await esApeX2.addMinter(owner.address);
  console.log("addMinter success");
  const apeXContract = await ethers.getContractAt("contracts/interfaces/IERC20.sol:IERC20", apeXToken);
  await apeXContract.approve(esApeX2.address, BigNumber.from("100000000000000000000000000000000000"));
  console.log("approve success");
  //   await esApeX2.connect(owner.address).mint(treasury, BigNumber.from("10000000000000000000000000"));
  //   console.log("mint success");
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
