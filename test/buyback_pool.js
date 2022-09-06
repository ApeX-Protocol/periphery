const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");

describe("banana BuybackPool", function () {
  let owner;
  let keeper;
  let rewardRecipient;
  let buybackPool;
  let banana;
  let usdc;
  let twamm;
  let twammTermSwap;
  let bananaDistributor;
  let initBuyingRate = BigNumber.from("1000000000000000000");
  let endBlock;

  let duration = 7 * 24 * 3600;
  let distributeTime = Math.floor(new Date() / 1000) + 60;
  let initReward = BigNumber.from("1000000000000000000000");
  let delta = 50;

  beforeEach(async function () {
    [owner, keeper, rewardRecipient] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockToken");
    banana = await MockToken.deploy("Banana", "BANA");
    usdc = await MockToken.deploy("USDC", "USDC");
    await usdc.mint(owner.address, BigNumber.from("100000000000000000000000000"));

    const MockTWAMM = await ethers.getContractFactory("MockTWAMM");
    twamm = await MockTWAMM.deploy();
    await twamm.setReserves(100000000, 200000000);

    const MockTWAMMTermSwap = await ethers.getContractFactory("MockTWAMMTermSwap");
    twammTermSwap = await MockTWAMMTermSwap.deploy();

    const BananaDistributor = await ethers.getContractFactory("BananaDistributor");
    bananaDistributor = await BananaDistributor.deploy(
      banana.address,
      keeper.address,
      rewardRecipient.address,
      duration,
      distributeTime,
      initReward,
      delta
    );

    const BuybackPool = await ethers.getContractFactory("BuybackPool");
    buybackPool = await BuybackPool.deploy(
      banana.address,
      usdc.address,
      twamm.address,
      twammTermSwap.address,
      bananaDistributor.address,
      initBuyingRate
    );
    await buybackPool.updateIntervalBlocks(10);
  });

  it("execute", async function () {
    await buybackPool.execute();
    let orderId = await buybackPool.lastOrderId();
    console.log("orderId:", orderId.toString());
    expect(orderId.toNumber()).to.be.equal(1);

    await mineBlocks(10);
    await buybackPool.execute();
    orderId = await buybackPool.lastOrderId();
    console.log("orderId:", orderId.toString());
    expect(orderId.toNumber()).to.be.equal(2);

    await mineBlocks(10);
    await buybackPool.execute();
    orderId = await buybackPool.lastOrderId();
    console.log("orderId:", orderId.toString());
    expect(orderId.toNumber()).to.be.equal(3);
  });
});

async function mineBlocks(blockNumber) {
  while (blockNumber > 0) {
    blockNumber--;
    await hre.network.provider.request({
      method: "evm_mine",
    });
  }
}
