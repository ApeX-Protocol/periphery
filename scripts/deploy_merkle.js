const { ethers, upgrades } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const verifyStr = "npx hardhat verify --network";

let apeXToken = "0x4FE2E72cBf1dE304C13E5D48fe3813c98d2C30d9";
let merkleRoot = "0x751a9fe060c8aaa31c18bf3ea03d8d028e45c63f668d05cecbd08af4d4decd8f";
let merkleDistributor;

const main = async () => {
  await createMerkleDistributor();
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
