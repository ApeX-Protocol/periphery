const { ethers } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const verifyStr = "npx hardhat verify --network";

const apeXAddress = "0x52A8845DF664D76C69d2EEa607CD793565aF42B8";
const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const bananaAddress = "0x2A1DCA74419c2D304A3D359F428eE1A4e9324A90";
const keeper = "0xD2B6D51Af2BF55864738FA1DB575D1c7b442B097";
const twamm = "0xcd43AbA971bEF65555D877657F83093dDFB885b8";
const initPrice = BigNumber.from("400000000000000");
// const startTime = Math.floor(new Date() / 1000) + 60;
const startTime = 1669017600;
const endTime = 1700468100;
const redeemTime = 1700726400;
const duration = 7 * 24 * 60 * 60;
const distributeTime = startTime + duration;
const initReward = BigNumber.from("480769230769230800000000000");
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
  const SelfSufficientERC20 = await ethers.getContractFactory("SelfSufficientERC20");
  if (apeXAddress == "") {
    apeX = await SelfSufficientERC20.deploy();
    await apeX.initlialize("MockApeX", "mAPEX", 18);
    await apeX.mint(owner.address, BigNumber.from("10000000000000000000000000000"));
    console.log("APEX:", apeX.address);
    console.log(verifyStr, process.env.HARDHAT_NETWORK, apeX.address);
  } else {
    apeX = SelfSufficientERC20.attach(apeXAddress);
  }

  if (usdcAddress == "") {
    usdc = await SelfSufficientERC20.deploy();
    await usdc.initlialize("SelfService", "SLF", 6);
    await usdc.mint(owner.address, BigNumber.from("10000000000000000"));
    console.log("USDC:", usdc.address);
    console.log(verifyStr, process.env.HARDHAT_NETWORK, usdc.address);
  } else {
    usdc = SelfSufficientERC20.attach(usdcAddress);
  }
}

async function createOrAttachBanana() {
  const Banana = await ethers.getContractFactory("Banana");
  if (bananaAddress == "") {
    banana = await Banana.deploy(apeXAddress, redeemTime);
    console.log("Banana:", banana.address);
    console.log(verifyStr, process.env.HARDHAT_NETWORK, banana.address, apeXAddress, redeemTime);
    // await apeX.approve(banana.address, BigNumber.from("1000000000000000000000000"));
    // await banana.mint(owner.address, BigNumber.from("1000000000000000000000000"));
  } else {
    banana = Banana.attach(bananaAddress);
  }
}

async function createClaimable() {
  const BananaClaimable = await ethers.getContractFactory("BananaClaimable");
  claimable = await BananaClaimable.deploy(bananaAddress);
  console.log("BananaClaimable:", claimable.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, claimable.address, bananaAddress);
  await claimable.setSigner(keeper, true);
}

async function createDistributor() {
  const BananaDistributor = await ethers.getContractFactory("BananaDistributor");
  distributor = await BananaDistributor.deploy(
    bananaAddress,
    keeper,
    claimable.address,
    duration,
    distributeTime,
    endTime,
    initReward,
    delta
  );
  console.log("BananaDistributor:", distributor.address);
  console.log(
    verifyStr,
    process.env.HARDHAT_NETWORK,
    distributor.address,
    bananaAddress,
    keeper,
    claimable.address,
    duration,
    distributeTime,
    endTime,
    initReward.toString(),
    delta
  );
}

async function createBuybackPool() {
  if (distributor == null) {
    const BananaDistributor = await ethers.getContractFactory("BananaDistributor");
    distributor = BananaDistributor.attach("0x0772ab6e3C6ba1d840608A45Ed310910F2E1A46d");
  }

  const BuybackPool = await ethers.getContractFactory("BuybackPool");
  buybackPool = await BuybackPool.deploy(
    bananaAddress,
    usdcAddress,
    twamm,
    distributor.address,
    keeper,
    duration,
    initPrice,
    initReward,
    startTime,
    endTime
  );
  console.log("BuybackPool:", buybackPool.address);
  console.log(
    verifyStr,
    process.env.HARDHAT_NETWORK,
    buybackPool.address,
    bananaAddress,
    usdcAddress,
    twamm,
    distributor.address,
    keeper,
    duration,
    initPrice.toString(),
    initReward.toString(),
    startTime,
    endTime
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
