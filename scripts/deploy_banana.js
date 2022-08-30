const { ethers } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const verifyStr = "npx hardhat verify --network";

const apeXAddress = "0xEBb0882632e06cbe8070296F7e4E638639f89068";
const usdcAddress = "";
const keeper = "0x1956b2c4C511FDDd9443f50b36C4597D10cD9985";
const twamm = "0xcdda22E7286516887B170563d497b658F8CB25CF";
const initPrice = BigNumber.from("250000000000000");
// const startTime = Math.floor(new Date() / 1000) + 60;
const startTime = 1661558400;
const redeemTime = 1662012000;
const duration = 24 * 60 * 60;
const distributeTime = startTime + duration;
const initReward = BigNumber.from("2000000000000000000000000");
const delta = 50;

let owner;
let apeX;
let banana;
let usdc;
let distributor;
let claimable;
let buybackPool;

const main = async () => {
  [owner] = await ethers.getSigners();
  await createOrAttachMockToken();
  // await createBanana();
  // await createClaimable();
  // await createDistributor();
  await createBuybackPool();
};

async function createOrAttachMockToken() {
  const MockToken = await ethers.getContractFactory("MockToken");
  if (apeXAddress == "") {
    apeX = await MockToken.deploy("MockApeX", "APEX");
    await apeX.mint(owner.address, BigNumber.from("10000000000000000000000000000"));
    console.log("APEX:", apeX.address);
    console.log(verifyStr, process.env.HARDHAT_NETWORK, apeX.address, "MockApeX", "APEX");
  } else {
    apeX = MockToken.attach(apeXAddress);
  }

  const MyToken = await ethers.getContractFactory("MyToken");
  if (usdcAddress == "") {
    usdc = await MyToken.deploy("MockUSDC", "USDC", 6, BigNumber.from("10000000000000000"));
    console.log("USDC:", usdc.address);
    console.log(
      verifyStr,
      process.env.HARDHAT_NETWORK,
      usdc.address,
      "MockUSDC",
      "USDC",
      6,
      BigNumber.from("10000000000000000").toString()
    );
  } else {
    usdc = MockToken.attach(usdcAddress);
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
    initReward.toString(),
    delta
  );
}

async function createBuybackPool() {
  if (banana == null) {
    const Banana = await ethers.getContractFactory("Banana");
    banana = Banana.attach("0x851C49AcABC499E406207557352e4e35C9E8cEB9");
  }
  if (distributor == null) {
    const BananaDistributor = await ethers.getContractFactory("BananaDistributor");
    distributor = BananaDistributor.attach("0x535a5eCFBC832e878aD2d72bC3cCE73bC25eABCf");
  }

  const BuybackPool = await ethers.getContractFactory("BuybackPool");
  buybackPool = await BuybackPool.deploy(
    banana.address,
    usdc.address,
    twamm,
    distributor.address,
    keeper,
    duration,
    initPrice,
    initReward,
    startTime
  );
  console.log("BuybackPool:", buybackPool.address);
  console.log(
    verifyStr,
    process.env.HARDHAT_NETWORK,
    buybackPool.address,
    banana.address,
    usdc.address,
    twamm,
    distributor.address,
    keeper,
    duration,
    initPrice.toString(),
    initReward.toString(),
    startTime
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
