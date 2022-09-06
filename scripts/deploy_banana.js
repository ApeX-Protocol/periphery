const { ethers } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const verifyStr = "npx hardhat verify --network";

const apeXAddress = "0xEBb0882632e06cbe8070296F7e4E638639f89068";
const usdcAddress = "0x4FE2E72cBf1dE304C13E5D48fe3813c98d2C30d9";
const bananaAddress = "0xFb2482208311fDe0b210D833C91e216ceAD0A881";
const keeper = "0xf166a0dfBce1B0Aa674E163B05b66906Db3B530e";
const twamm = "0xcdda22E7286516887B170563d497b658F8CB25CF";
const initPrice = BigNumber.from("400000000000000");
// const startTime = Math.floor(new Date() / 1000) + 60;
const startTime = 1662422400;
const redeemTime = 1663200000;
const duration = 24 * 60 * 60;
const distributeTime = startTime + duration;
const initReward = BigNumber.from("961538461538461600000000000");
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
  await createOrAttachBanana();
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

async function createOrAttachBanana() {
  const Banana = await ethers.getContractFactory("Banana");
  if (bananaAddress == "") {
    banana = await Banana.deploy(apeX.address, redeemTime);
    console.log("Banana:", banana.address);
    console.log(verifyStr, process.env.HARDHAT_NETWORK, banana.address, apeX.address, redeemTime);
  } else {
    banana = Banana.attach(bananaAddress);
  }
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
  if (distributor == null) {
    const BananaDistributor = await ethers.getContractFactory("BananaDistributor");
    distributor = BananaDistributor.attach("0x37507455a4757d63Cc146A4c7c771e2179323FBf");
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
