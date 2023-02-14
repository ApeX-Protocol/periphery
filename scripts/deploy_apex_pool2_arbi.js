const { ethers, upgrades } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const verifyStr = "npx hardhat verify --network";

const main = async () => {
  const owner = "0xc8E1E695eeaCdCCCb4e529F6134919ca7378468E";
  const apeXToken = "0x61A1ff55C5216b636a294A07D77C6F4Df10d3B56";

  const MockToken = await ethers.getContractFactory("SelfSufficientERC20");
  const apeX = await MockToken.deploy();
  await apeX.initlialize("ApeXToken", "APEX", 18);
  console.log("ApeX:", apeX.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, apeX.address);

  const ApeXPool = await ethers.getContractFactory("ApeXPool2OnArbi");
  let apeXPool = await ApeXPool.deploy(apeXToken, owner);
  console.log("ApeXPool:", apeXPool.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, apeXPool.address, apeXToken, owner);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
