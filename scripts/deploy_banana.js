const { ethers } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const verifyStr = "npx hardhat verify --network";

const apeXAddress = "0xEBb0882632e06cbe8070296F7e4E638639f89068";
const usdcAddress = "0xd44BB808bfE43095dBb94c83077766382D63952a";
const bananaAddress = "";
const keeper = "0xf166a0dfBce1B0Aa674E163B05b66906Db3B530e";
const twamm = "0x70Ced1b9Ae6E51CFDc03b9E2458b7D59Ec85458b";
const initPrice = BigNumber.from("400000000000000");
// const startTime = Math.floor(new Date() / 1000) + 60;
const startTime = 1663639200;
const redeemTime = 1663657200;
const duration = 1 * 60 * 60;
const distributeTime = startTime + duration;
const initReward = BigNumber.from("10000000000000000000000");
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
  await createClaimable();
  await createDistributor();
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
    // await apeX.approve(banana.address, BigNumber.from("1000000000000000000000000"));
    // await banana.mint(owner.address, BigNumber.from("1000000000000000000000000"));
  } else {
    banana = Banana.attach(bananaAddress);
  }
}

async function createClaimable() {
  const BananaClaimable = await ethers.getContractFactory("BananaClaimable");
  claimable = await BananaClaimable.deploy(banana.address);
  console.log("BananaClaimable:", claimable.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, claimable.address, banana.address);
  await claimable.setSigner(keeper, true);
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
    distributor = BananaDistributor.attach("0x2f33aa43ef28e23aFb0fBDAa745eF073B6D79721");
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
