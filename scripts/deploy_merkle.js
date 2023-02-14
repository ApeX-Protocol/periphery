const { ethers, upgrades } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const verifyStr = "npx hardhat verify --network";

let esApeX = "0x44Af87B33620c775A8363194C24ffc3067F8497C";
let merkleRoot = "0xd12e1f6c1a20ac9447c9bf499d7c770d258d3c4731fa224601813e0dbede1cdf";
let merkleDistributor;

const main = async () => {
  await createMerkleDistributor();
};

async function createMerkleDistributor() {
  const MerkleDistributor = await ethers.getContractFactory("MerkleDistributor");
  merkleDistributor = await MerkleDistributor.deploy(esApeX, merkleRoot);
  console.log("MerkleDistributor:", merkleDistributor.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, merkleDistributor.address, esApeX, merkleRoot);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
