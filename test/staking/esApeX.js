const { expect, use } = require("chai");
const { ethers } = require("hardhat");
const { solidity } = require("ethereum-waffle");
const { deployContract } = require("../shared/utilities");

use(solidity);

describe("esApeX contract", function () {
  let esApeXToken, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    esApeXToken = await deployContract("MockEsApeX"); //addr1 is operator when init
  });

  describe("mint", function () {
    it("can mint by operator", async function () {
      await esApeXToken.addOperator(addr1.address);
      let oldBalance = (await esApeXToken.balanceOf(owner.address)).toNumber();
      await esApeXToken.connect(addr1).mint(owner.address, 100);
      let newBalance = (await esApeXToken.balanceOf(owner.address)).toNumber();
      expect(newBalance).to.be.equal(oldBalance + 100);
    });

    it("revert when mint by non-operator", async function () {
      await expect(esApeXToken.connect(addr1).mint(owner.address, 100)).to.be.revertedWith("whitelist: NOT_IN_OPERATOR");
    });

    it("can mint by new operator", async function () {
      await esApeXToken.addOperator(addr1.address);
      let oldBalance = (await esApeXToken.balanceOf(owner.address)).toNumber();
      await esApeXToken.mint(owner.address, 100);
      let newBalance = (await esApeXToken.balanceOf(owner.address)).toNumber();
      expect(newBalance).to.be.equal(oldBalance + 100);
    });

    it("revert when mint by delete operator", async function () {
      await esApeXToken.addOperator(addr1.address);
      await esApeXToken.removeOperator(addr1.address);
      await expect(esApeXToken.connect(addr1).mint(owner.address, 100)).to.be.revertedWith(
        "whitelist: NOT_IN_OPERATOR"
      );
    });
  });

  describe("burn", function () {
    it("can burn by operator", async function () {
      await esApeXToken.addOperator(addr1.address);
      await esApeXToken.connect(addr1).mint(owner.address, 100);
      let oldBalance = (await esApeXToken.balanceOf(owner.address)).toNumber();
      await esApeXToken.connect(addr1).burn(owner.address, 100);
      let newBalance = (await esApeXToken.balanceOf(owner.address)).toNumber();
      expect(newBalance).to.be.equal(oldBalance - 100);
    });

    it("revert when burn by non-operator", async function () {
      await expect(esApeXToken.connect(addr1).burn(owner.address, 100)).to.be.revertedWith("whitelist: NOT_IN_OPERATOR");
    });

    it("can burn by new operator", async function () {
      await esApeXToken.addOperator(addr1.address);
      await esApeXToken.mint(owner.address, 100);
      let oldBalance = (await esApeXToken.balanceOf(owner.address)).toNumber();
      await esApeXToken.burn(owner.address, 100);
      let newBalance = (await esApeXToken.balanceOf(owner.address)).toNumber();
      expect(newBalance).to.be.equal(oldBalance - 100);
    });

    it("revert when burn by deleted operator", async function () {
      await esApeXToken.addOperator(addr1.address);
      await esApeXToken.removeOperator(addr1.address);
      await expect(esApeXToken.connect(addr1).burn(owner.address, 100)).to.be.revertedWith(
        "whitelist: NOT_IN_OPERATOR"
      );
    });
  });

  describe("transfer", function () {
    it("can transfer by whitelist", async function () {
      await esApeXToken.mint(owner.address, 100);
      await esApeXToken.addManyWhitelist([owner.address]);
      let oldBalance = (await esApeXToken.balanceOf(owner.address)).toNumber();
      await esApeXToken.transfer(addr1.address, 100);
      let newBalance = (await esApeXToken.balanceOf(owner.address)).toNumber();
      expect(newBalance).to.be.equal(oldBalance - 100);
    });

    it("can transfer by operator", async function () {
      await esApeXToken.mint(owner.address, 100);
      let oldBalance = (await esApeXToken.balanceOf(owner.address)).toNumber();
      await esApeXToken.transfer(addr1.address, 100);
      let newBalance = (await esApeXToken.balanceOf(owner.address)).toNumber();
      expect(newBalance).to.be.equal(oldBalance - 100);
    });

    it("revert when transfer by non-whitelist and non-operator", async function () {
      await expect(esApeXToken.connect(addr1).transfer(owner.address, 100)).to.be.revertedWith(
        "whitelist: NOT_IN_OPERATOR_OR_WHITELIST"
      );
    });

    it("revert when transfer by deleted operator", async function () {
      await esApeXToken.addOperator(addr1.address);
      await esApeXToken.removeOperator(addr1.address);
      await expect(esApeXToken.connect(addr1).transfer(owner.address, 100)).to.be.revertedWith(
        "whitelist: NOT_IN_OPERATOR_OR_WHITELIST"
      );
    });

    it("revert when transfer exceed balance", async function () {
      await esApeXToken.addOperator(addr1.address);
      await esApeXToken.mint(addr1.address, 100);
      await expect(esApeXToken.connect(addr1).transfer(owner.address, 101)).to.be.revertedWith(
        "esApeX: transfer amount exceeds balance"
      );
    });
  });

  describe("transferFrom", function () {
    it("can transferFrom by whitelist", async function () {
      await esApeXToken.mint(owner.address, 100);
      await esApeXToken.addManyWhitelist([addr2.address]);
      await esApeXToken.approve(addr2.address, 100);
      let oldBalance = (await esApeXToken.balanceOf(owner.address)).toNumber();
      await esApeXToken.connect(addr2).transferFrom(owner.address, addr1.address, 100);
      let newBalance = (await esApeXToken.balanceOf(owner.address)).toNumber();
      expect(newBalance).to.be.equal(oldBalance - 100);
    });

    it("can transferFrom by operator", async function () {
      await esApeXToken.addOperator(addr1.address);
      await esApeXToken.mint(addr1.address, 100);
      await esApeXToken.connect(addr1).approve(owner.address, 100);
      let oldBalance = (await esApeXToken.balanceOf(addr1.address)).toNumber();
      await esApeXToken.connect(owner).transferFrom(addr1.address, owner.address, 100);
      let newBalance = (await esApeXToken.balanceOf(addr1.address)).toNumber();
      expect(newBalance).to.be.equal(oldBalance - 100);
    });

    it("revert when transferFrom by non-whitelist and non-operator", async function () {
      await expect(esApeXToken.connect(addr1).transferFrom(addr1.address, owner.address, 100)).to.be.revertedWith(
        "whitelist: NOT_IN_OPERATOR_OR_WHITELIST"
      );
    });

    it("revert when transferFrom by deleted operator", async function () {
      await esApeXToken.addOperator(addr1.address);
      await esApeXToken.removeOperator(addr1.address);
      await expect(esApeXToken.connect(addr1).transferFrom(addr1.address, owner.address, 100)).to.be.revertedWith(
        "whitelist: NOT_IN_OPERATOR_OR_WHITELIST"
      );
    });

    it("revert when transferFrom exceed allowance", async function () {
      await esApeXToken.addOperator(addr1.address);
      await esApeXToken.mint(addr1.address, 100);
      await esApeXToken.approve(addr1.address, 100);
      await expect(esApeXToken.connect(addr1).transferFrom(addr1.address, owner.address, 101)).to.be.revertedWith(
        "esApeX: transfer amount exceeds allowance"
      );
    });

    it("revert when transferFrom exceed balance", async function () {
      await esApeXToken.addOperator(addr1.address);
      await esApeXToken.mint(addr1.address, 100);
      await esApeXToken.approve(addr1.address, 101);
      await expect(esApeXToken.connect(addr1).transferFrom(addr1.address, owner.address, 101)).to.be.revertedWith(
        "esApeX: transfer amount exceeds allowance"
      );
    });
  });
});
