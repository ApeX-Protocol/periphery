const { ethers } = require("hardhat");
const verifyStr = "npx hardhat verify --network";

const apeXAddress = "0x1661181907bBbd0688EBC6B3b630b3669bBB4Bd4";
const bananaAddress = "0xe95b3Dc78c0881dEa17A69BaFC6cFeB8d891e9DE";
const claimableAddress = "0x1A533156f619f79abdCf6cdb0F02941328E3E016";
const usdtAddress = "0x89cBccEdDF07A14aFf90eF5D3A7D5BEf9e33Cb6b";
const keeper = "0x689497fE7a5e4A0aaE971879E544588E3e447151";
const redeemTime = 1672830000;

let owner;
let apeX;
let banana;
let claimable;
let usdt;

const main = async () => {
  [owner] = await ethers.getSigners();
  // await createOrAttachMockToken();
  // await createOrAttachBanana();
  // await createClaimable();
  // await setClaimableSigner();
  await verify();
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

async function createClaimable() {
  const BananaClaimable = await ethers.getContractFactory("BananaClaimable");
  if (claimableAddress == "") {
    claimable = await BananaClaimable.deploy(banana.address);
    console.log("BananaClaimable:", claimable.address);
    console.log(verifyStr, process.env.HARDHAT_NETWORK, claimable.address, banana.address);
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

async function verify() {
  await hre.run("verify:verify", {
    address: bananaAddress,
    contract: "contracts/banana/BananaV2.sol:BananaV2",
    constructorArguments: [
      apeXAddress,
      redeemTime
    ],
  });

   await hre.run("verify:verify", {
     address: claimableAddress,
     contract: "contracts/banana/BananaClaimable.sol:BananaClaimable",
     constructorArguments: [
       bananaAddress
     ],
   });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
