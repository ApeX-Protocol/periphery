const { ethers } = require("hardhat");
const verifyStr = "npx hardhat verify --network";

const apeXAddress = "0x52A8845DF664D76C69d2EEa607CD793565aF42B8";
const bananaAddress = "0x93fa1D7c310692eAf390F951828f8791bC19cb36";
const minterAddress = "0xD6709cc6BdFb43e31E5D959Ee1B0775923672694";
const claimableAddress = "0x4E59A6944ec90917a71d226227B458bfa7A9f86f";
const usdtAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const keeper = "";
const redeemTime = 1737907200;

let owner;
let apeX;
let banana;
let claimable;
let usdt;

const main = async () => {
  [owner] = await ethers.getSigners();
  // await onlyCreateBanana();
  // await createOrAttachMockToken();
  // await createOrAttachBanana();
  await createClaimable();
  // await setClaimableSigner();
  // await verify();
  // await addMinter();
};

async function createOrAttachMockToken() {
  const SelfSufficientERC20 = await ethers.getContractFactory("SelfSufficientERC20");
  if (apeXAddress == "") {
    apeX = await SelfSufficientERC20.deploy();
    await apeX.initlialize("MockApeX", "mAPEX", 18);
    console.log("APEX:", apeX.address);

    let mintAmount = ethers.utils.parseEther('20000')
    console.log("mint APEX amount:", mintAmount);

    await apeX.mint(owner.address, mintAmount);
  } else {
    apeX = SelfSufficientERC20.attach(apeXAddress);
  }

  let mintAmount = ethers.utils.parseEther('20000000000000000')
  await apeX.mint(owner.address, mintAmount);

  if (usdtAddress == "") {
    usdt = await SelfSufficientERC20.deploy();
    await usdt.initlialize("MockUsdt", "mUSDT", 18);
    console.log("USDT:", usdt.address);

    let mintAmount = ethers.utils.parseEther('2000000')
    console.log("mint USDT amount:", mintAmount);
    await usdt.mint(owner.address, mintAmount);
  } else {
    usdt = SelfSufficientERC20.attach(usdtAddress);
  }
}

async function createOrAttachBanana() {
  const Banana = await ethers.getContractFactory("BananaV2");
  if (bananaAddress == "") {
    banana = await Banana.deploy(apeXAddress, redeemTime);
    console.log("Banana:", banana.address);
    console.log(verifyStr, process.env.HARDHAT_NETWORK, banana.address, apeXAddress, redeemTime);

    let mintApexSpent = ethers.utils.parseEther('20000')
    let approveTx = await apeX.approve(banana.address, mintApexSpent);
    await approveTx.wait();

    let apexBalance = await apeX.balanceOf(owner.address);
    console.log("apexBalance:", apexBalance);
    if (mintApexSpent.gt(apexBalance)) {
      console.log("apexBalance not enough", apexBalance);
      return
    }

    let mintTx = await banana.mint(owner.address, mintApexSpent);
    await mintTx.wait();

    let afterMintBanaBalance = await banana.balanceOf(owner.address);
    console.log("afterMintBanaBalance:", afterMintBanaBalance);
  } else {
    banana = Banana.attach(bananaAddress);
  }
}

async function onlyCreateBanana() {
  const Banana = await ethers.getContractFactory("BananaV2");
  if (bananaAddress == "") {
    banana = await Banana.deploy(apeXAddress, redeemTime);
    console.log("Banana:", banana.address);
    console.log(verifyStr, process.env.HARDHAT_NETWORK, banana.address, apeXAddress, redeemTime);
  } else {
    banana = Banana.attach(bananaAddress);
  }
}

async function addMinter(){
  const Banana = await ethers.getContractFactory("BananaV2");
  banana = Banana.attach(bananaAddress);

  let addMinterTx = await banana.addMinter(minterAddress);
  await addMinterTx.wait();
}

async function createClaimable() {
  const BananaClaimable = await ethers.getContractFactory("BananaClaimable");
  if (claimableAddress == "") {
    claimable = await BananaClaimable.deploy(bananaAddress);
    console.log("BananaClaimable:", claimable.address);
    console.log(verifyStr, process.env.HARDHAT_NETWORK, claimable.address, bananaAddress);
  } else{
    claimable = BananaClaimable.attach(claimableAddress);
  }
}

async function setClaimableSigner() {
  if (keeper != ""){
    let setSignerTx = await claimable.setSigner(keeper, true);
    await setSignerTx.wait();
  }
}

async function verify(){
  await hre.run("verify:verify", {
    address: bananaAddress,
    contract: "contracts/banana/BananaV2.sol:BananaV2",
    constructorArguments: [
      apeXAddress,
      redeemTime
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
