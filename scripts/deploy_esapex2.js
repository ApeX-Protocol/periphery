const { ethers } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const verifyStr = "npx hardhat verify --network";

const main = async () => {
  const owner = "0xD6709cc6BdFb43e31E5D959Ee1B0775923672694";
  const apeXToken = "0x52A8845DF664D76C69d2EEa607CD793565aF42B8";
  const treasury = "0x7751A0938fd7E5d69Ba212A0cF31B7e5De7BfC9F";
  const vestTime = 180 * 24 * 3600;
  const forceWithdrawMinRemainRatio = 1666;

  // let owner;
  // [owner] = await ethers.getSigners();
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

  // await esApeX2.addMinter(owner.address);
  // console.log("addMinter success");
  // const apeXContract = await ethers.getContractAt("contracts/interfaces/IERC20.sol:IERC20", apeXToken);
  // await apeXContract.approve(esApeX2.address, BigNumber.from("100000000000000000000000000000000000"));
  // console.log("approve success");
  //   await esApeX2.connect(owner.address).mint(treasury, BigNumber.from("10000000000000000000000000"));
  //   console.log("mint success");
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
