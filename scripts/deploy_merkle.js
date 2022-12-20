const { ethers, upgrades } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const verifyStr = "npx hardhat verify --network";

let esApeX = "0x44Af87B33620c775A8363194C24ffc3067F8497C";
let merkleRoot = "0x598782f333ada809da3709ff4c6770e85d906e5e9b8a50c414faf82fdd3fb22c";
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
