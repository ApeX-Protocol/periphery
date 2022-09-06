const { expect } = require("chai");
const { BigNumber } = require("ethers");

describe("RewardForWSOT contract", function () {
  let owner;
  let user1;
  let user2;
  let user3;
  let nft;
  let erc20;
  let ct = Math.floor(new Date() / 1000);
  let rewardForWSOT;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    const MockToken = await ethers.getContractFactory("MockToken");
    erc20 = await MockToken.deploy("AAA token", "AAA");
    const NftSquid = await ethers.getContractFactory("NftSquid");
    nft = await NftSquid.deploy("APEX NFT", "APEXNFT", "https://apexNFT/", erc20.address, ct - 1000, ct + 5800);
    for (let i = 0; i < 2; i++) {
      await nft.claimApeXNFT(i, { value: 1000000000000000 });
    }
    const tokenId1 = await nft.tokenOfOwnerByIndex(owner.address, 0);
    const tokenId2 = await nft.tokenOfOwnerByIndex(owner.address, 1);
    console.log("tokenId1:", tokenId1.toNumber());
    console.log("tokenId2:", tokenId2.toNumber());

    const RewardForWSOT = await ethers.getContractFactory("RewardForWSOT");
    rewardForWSOT = await RewardForWSOT.deploy(nft.address);

    await nft.transferFrom(owner.address, rewardForWSOT.address, tokenId1);
    await nft.transferFrom(owner.address, rewardForWSOT.address, tokenId2);

    await rewardForWSOT.addTokenIds([tokenId1, tokenId2]);
    await rewardForWSOT.addWinners([owner.address, user1.address]);
  });

  describe("claimNFT", function () {
    it("winner claim", async function () {
      const indexBefore = await rewardForWSOT.index();
      console.log("indexBefore:", indexBefore.toNumber());
      await rewardForWSOT.claimNFT();
      expect(await nft.balanceOf(owner.address)).to.be.equal(2);

      const indexAfter = await rewardForWSOT.index();
      console.log("indexAfter:", indexAfter.toNumber());

      await rewardForWSOT.connect(user1).claimNFT();
      const indexAfter2 = await rewardForWSOT.index();
      console.log("indexAfter2:", indexAfter2.toNumber());
      expect(indexAfter2).to.be.equal(2);
      expect(await nft.balanceOf(user1.address)).to.be.equal(1);
    });

    it("user2 claim", async function () {
      await expect(rewardForWSOT.connect(user2).claimNFT()).to.be.revertedWith("FORBIDDEN");
    });
  });
});
