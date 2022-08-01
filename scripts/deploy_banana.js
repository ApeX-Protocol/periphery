const { ethers } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const verifyStr = "npx hardhat verify --network";

const apeXAddress = "0x2014B354e8D3E5F49519a414b250Eda65e618e1c";
const keeper = "0x1956b2c4C511FDDd9443f50b36C4597D10cD9985";
const redeemTime = Math.floor(new Date() / 1000) + 60;
const duration = 60 * 60;
const distributeTime = Math.floor(new Date() / 1000) + 60;
const initReward = 1000000;
const delta = 50;

let owner;
let apeX;
let banana;
let distributor;
let claimable;

const main = async () => {
  [owner] = await ethers.getSigners();
  await createOrAttachApeX();
  await createBanana();
  await createClaimable();
  await createDistributor();
};

async function createOrAttachApeX() {
  const MockToken = await ethers.getContractFactory("MockToken");
  if (apeXAddress == "") {
    apeX = await MockToken.deploy("MockApeX", "APEX");
    await apeX.mint(owner.address, BigNumber.from("10000000000000000000000000000"));
    console.log("APEX:", apeX.address);
    console.log(verifyStr, process.env.HARDHAT_NETWORK, apeX.address, "MockApeX", "APEX");
  } else {
    apeX = await MockToken.attach(apeXAddress);
  }
}

async function createBanana() {
  const Banana = await ethers.getContractFactory("Banana");
  banana = await Banana.deploy(apeX.address, redeemTime);
  console.log("Banana:", banana.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, banana.address, apeX.address, redeemTime);
}

async function createClaimable() {
  const BananaClaimable = await ethers.getContractFactory("BananaClaimable");
  claimable = await BananaClaimable.deploy(banana.address);
  console.log("BananaClaimable:", claimable.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, claimable.address, banana.address);
}

async function createDistributor() {
  const BananaDistributor = await ethers.getContractFactory("BananaDistributor");
  distributor = await BananaDistributor.deploy(
    banana.address,
    keeper,
    claimable.address,
    duration,
    distributeTime,
    initReward,
    delta
  );
  console.log("BananaDistributor:", distributor.address);
  console.log(
    verifyStr,
    process.env.HARDHAT_NETWORK,
    distributor.address,
    banana.address,
    keeper,
    claimable.address,
    duration,
    distributeTime,
    initReward,
    delta
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
