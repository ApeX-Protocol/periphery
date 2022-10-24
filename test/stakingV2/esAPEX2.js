// import { expect } from "chai";
// import { ethers } from "hardhat";
// import { time } from "@nomicfoundation/hardhat-network-helpers";
// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// import { Contract } from "ethers";
// js 的写法
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Apple", function () {
  let owner;
  let treasury;
  let apeXToken;
  let esAPEX2;
  const vestTime = 3600;
  const minRemainRatio = 1666;

  beforeEach(async function () {
    [owner, treasury] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockToken");
    apeXToken = await MockToken.deploy("ApeXToken", "APEX");
    await apeXToken.deployed();

    const EsAPEX2 = await ethers.getContractFactory("EsAPEX2");
    esAPEX2 = await EsAPEX2.deploy(apeXToken.address, treasury.address, vestTime, minRemainRatio);
    await esAPEX2.deployed();
  });

  describe("mint", function () {
    it("not a minter", async function () {
      await apeXToken.mint(owner.address, 1000000000);
      await apeXToken.approve(esAPEX2.address, 1000000000);
      await expect(esAPEX2.mint(owner.address, 1000000000)).to.be.revertedWith("not minter");
    });

    it("mint by a minter", async function () {
      await esAPEX2.addMinter(owner.address);
      await apeXToken.mint(owner.address, 1000000000);
      await apeXToken.approve(esAPEX2.address, 1000000000);
      await esAPEX2.mint(owner.address, 1000000000);
      expect(await apeXToken.balanceOf(owner.address)).to.equal(0);
      expect(await esAPEX2.balanceOf(owner.address)).to.equal(1000000000);
    });
  });

  describe("vest", function () {
    beforeEach(async function () {
      await esAPEX2.addMinter(owner.address);
      await apeXToken.mint(owner.address, 1000000000);
      await apeXToken.approve(esAPEX2.address, 1000000000);
      await esAPEX2.mint(owner.address, 1000000000);
    });

    it("vest", async function () {
      await esAPEX2.vest(1000000000);
      const vestInfo = await esAPEX2.getVestInfo(owner.address, 0);
      expect(await esAPEX2.balanceOf(owner.address)).to.equal(0);
      expect(vestInfo.vestAmount).to.equal(1000000000);

      await time.increase(vestTime / 2);
      let claimable = await esAPEX2.getClaimable(owner.address, 0);
      expect(claimable).to.equal(1000000000 / 2);

      await time.increase(vestTime / 2);
      claimable = await esAPEX2.getClaimable(owner.address, 0);
      expect(claimable).to.equal(1000000000);
    });
  });

  describe("withdraw", function () {
    beforeEach(async function () {
      await esAPEX2.addMinter(owner.address);
      await apeXToken.mint(owner.address, 1000000000);
      await apeXToken.approve(esAPEX2.address, 1000000000);
      await esAPEX2.mint(owner.address, 1000000000);
      await esAPEX2.vest(1000000000);
    });

    it("withdraw", async function () {
      await time.increase(vestTime / 2);
      await esAPEX2.withdraw(owner.address, 0, 1000000000 / 2);
      let apeXBalance = await apeXToken.balanceOf(owner.address);
      expect(apeXBalance).to.equal(1000000000 / 2);

      await time.increase(vestTime / 2);
      await esAPEX2.withdraw(owner.address, 0, 1000000000 / 2);
      apeXBalance = await apeXToken.balanceOf(owner.address);
      expect(apeXBalance).to.equal(1000000000);
    });
  });

  describe("forceWithdraw", function () {
    beforeEach(async function () {
      await esAPEX2.addMinter(owner.address);
      await apeXToken.mint(owner.address, 1000000000);
      await apeXToken.approve(esAPEX2.address, 1000000000);
      await esAPEX2.mint(owner.address, 1000000000);
      await esAPEX2.vest(1000000000);
    });

    it("forceWithdraw", async function () {
      await time.increase(vestTime);
      await esAPEX2.forceWithdraw(owner.address, 0);
      const apeXBalance = await apeXToken.balanceOf(owner.address);
      console.log("apeXBalance:", apeXBalance);
    });
  });
});
