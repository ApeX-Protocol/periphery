const { ethers, upgrades } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const verifyStr = "npx hardhat verify --network";

const main = async () => {
  const owner = "0xc8E1E695eeaCdCCCb4e529F6134919ca7378468E";
  const apeXToken = "0x52A8845DF664D76C69d2EEa607CD793565aF42B8";
  const esApeXToken = "0x44Af87B33620c775A8363194C24ffc3067F8497C";

  const ApeXPool = await ethers.getContractFactory("ApeXPool2");
  let apeXPool = await ApeXPool.deploy(apeXToken, esApeXToken, owner);
  console.log("ApeXPool:", apeXPool.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, apeXPool.address, apeXToken, esApeXToken, owner);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
