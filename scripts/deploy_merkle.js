const { ethers, upgrades } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const verifyStr = "npx hardhat verify --network";

let apeXToken = "0x61A1ff55C5216b636a294A07D77C6F4Df10d3B56";
let merkleRoot = "0xcf71d38f74a6c30da225d9bf93250f5e9af9d09cb17a6b562dc6a4d49c353980";
let merkleDistributor;

const main = async () => {
  // await createInvitation();
  await createRewardForCashback();
};

async function createMerkleDistributor() {
  const MerkleDistributor = await ethers.getContractFactory("MerkleDistributor");
  merkleDistributor = await MerkleDistributor.deploy(apeXToken, merkleRoot);
  console.log("MerkleDistributor:", merkleDistributor.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, merkleDistributor.address, apeXToken, merkleRoot);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
