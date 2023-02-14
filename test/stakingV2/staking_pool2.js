// import { expect } from "chai";
// import { ethers } from "hardhat";
// import { time } from "@nomicfoundation/hardhat-network-helpers";
// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// import { Contract } from "ethers";
// js 的写法
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("StakingPool2", function () {
  let owner;
  let stakeToken;
  let rewardToken;
  let stakingPool;
  const rewardPerSecond = BigNumber.from("1000000000000000000");
  const endTime = 1671840000;
  const minPeriod = 3600;

  beforeEach(async function () {
    [owner, treasury] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockToken");
    stakeToken = await MockToken.deploy("StakeToken", "STAKE");
    await stakeToken.deployed();
    rewardToken = await MockToken.deploy("RewardToken", "REWARD");
    await rewardToken.deployed();

    const StakingPool = await ethers.getContractFactory("StakingPool2");
    stakingPool = await StakingPool.deploy();
    await stakingPool.initialize(
      owner.address,
      stakeToken.address,
      rewardToken.address,
      rewardPerSecond,
      endTime,
      minPeriod
    );
  });

  describe("currentDeposit", function () {
    it("", async function () {});

    it("", async function () {});
  });

  describe("fixedDeposit", function () {});

  describe("withdraw", function () {});

  describe("claimReward", function () {});
});
