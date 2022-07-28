const { ethers, upgrades } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const verifyStr = "npx hardhat verify --network";

let apeXToken = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
let merkleRoot = "0xb2c65f6fa6b4e4236ee6037b0a87d3bfbe57de63b66f50a92e0b5b3109e9aa85";
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
