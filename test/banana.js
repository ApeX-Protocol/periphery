const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("banana", function () {
  const redeemTime = Math.floor(new Date() / 1000) + 60;
  const duration = 120;
  const distributeTime = Math.floor(new Date() / 1000) + 60;
  const initReward = 10000;
  const delta = 50;

  let owner;
  let keeper;
  let apeXToken;
  let banana;
  let distributor;
  let claimable;

  beforeEach(async function () {
    [owner, keeper] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockToken");
    apeXToken = await MockToken.deploy("ApeX", "APEX");
    await apeXToken.mint(owner.address, 1000000);

    const Banana = await ethers.getContractFactory("Banana");
    banana = await Banana.deploy(apeXToken.address, redeemTime);
    await banana.addMinter(owner.address);
    await banana.addBurner(owner.address);

    const Claimable = await ethers.getContractFactory("BananaClaimable");
    claimable = await Claimable.deploy(banana.address);

    const Distributor = await ethers.getContractFactory("BananaDistributor");
    distributor = await Distributor.deploy(
      banana.address,
      keeper.address,
      claimable.address,
      duration,
      distributeTime,
      initReward,
      delta
    );
  });

  it("mint", async function () {
    await apeXToken.approve(banana.address, 1000000);
    await banana.mint(owner.address, 1000000);
    let bananaBalance = await banana.balanceOf(owner.address);
    console.log("banana balance:", bananaBalance.toString());
    let apeXBalance = await apeXToken.balanceOf(banana.address);
    console.log("apeX balance:", apeXBalance.toString());
    expect(bananaBalance).to.be.equal(apeXBalance * 1000);
  });

  it("burn", async function () {
    await apeXToken.approve(banana.address, 1000000);
    await banana.mint(owner.address, 1000000);
    await banana.burn(owner.address, 50000);
    bananaBalance = await banana.balanceOf(owner.address);
    console.log("banana balance:", bananaBalance.toString());
    expect(bananaBalance).to.be.equal(999950000);
  });

  it("redeem", async function () {
    await apeXToken.approve(banana.address, 1000000);
    await banana.mint(owner.address, 1000000);
    await banana.burn(owner.address, 500000);

    await mineBlocks(60);
    await banana.redeem(100000000);
    bananaBalance = await banana.balanceOf(owner.address);
    apeXBalance = await apeXToken.balanceOf(owner.address);
    console.log("banana balance:", bananaBalance.toString());
    console.log("apeX balance:", apeXBalance.toString());
  });

  it("distribute", async function () {
    await apeXToken.approve(banana.address, 1000000);
    await banana.mint(distributor.address, 1000000);

    await mineBlocks(61);
    await distributor.connect(keeper).distribute(1000);
    let leftBanana = await banana.balanceOf(distributor.address);
    console.log("leftBanana:", leftBanana.toString());
    let claimableBanana = await banana.balanceOf(claimable.address);
    console.log("claimableBanana:", claimableBanana.toString());

    await mineBlocks(61);
    await distributor.connect(keeper).distribute(4000);
    leftBanana = await banana.balanceOf(distributor.address);
    console.log("leftBanana:", leftBanana.toString());
    claimableBanana = await banana.balanceOf(claimable.address);
    console.log("claimableBanana:", claimableBanana.toString());
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
