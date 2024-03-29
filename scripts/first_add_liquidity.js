const hre = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
const ethers = hre.ethers;

//goerli
async function main() {
  // if (hre.network.name === "mainnet") {
  //   console.log("Deploying TWAMM to mainnet. Hit ctrl + c to abort");
  // }

  const [account] = await ethers.getSigners();
  console.log("Account Address:", await account.getAddress());

  console.log("Account balance:", (await account.getBalance()).toString());

  //banana
  const token0Addr = "0x55630FF201036a75710B142A83fF473ed54E6f12";
  let banaPrice = 0.0004;
  let usdcAmount = 250000;
  const initialToken0Supply = BigNumber.from("625000000000000000000000000");
  console.log("banana: ", initialToken0Supply);
  //usdc
  const token1Addr = "0xd44BB808bfE43095dBb94c83077766382D63952a";
  const initialToken1Supply = BigNumber.from(usdcAmount * 1000000);
  console.log("usdc: ", initialToken1Supply);

  const TWAMMAddr = "0xc0767d86dDf8b172f2B57AD6Ddf59B35c3170E81";

  const token0 = await ethers.getContractAt("contracts/interfaces/IERC20.sol:IERC20", token0Addr);
  const token1 = await ethers.getContractAt("contracts/interfaces/IERC20.sol:IERC20", token1Addr);
  // loading necessary contracts

  const twamm = await ethers.getContractAt("contracts/twamm/interface/ITWAMM.sol:ITWAMM", TWAMMAddr);

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  //provide (initial) liquidity
  let currentBlockNumber = await ethers.provider.getBlockNumber();
  let timeStamp = (await ethers.provider.getBlock(currentBlockNumber)).timestamp;
  console.log("current block number", timeStamp);

  try {
    let tx = await twamm.createPairWrapper(token0Addr, token1Addr, timeStamp + 100);
    await tx.wait();
    console.log("create pair successfully");
  } catch (error) {
    console.log("continute without pair creation, the pair might be created already.");
  }
  const pairAddr = await twamm.obtainPairAddress(token0Addr, token1Addr);
  console.log("pair address check", pairAddr);

  console.log("add initial liquidity");
  let pairContract = await ethers.getContractAt("IPair", pairAddr);
  let lpamount = await pairContract.getTotalSupply();
  console.log("lpamount", lpamount);

  let tokenAReserve = await pairContract.tokenAReserves();
  console.log("tokenAReserve", tokenAReserve);
  let tokenBReserve = await pairContract.tokenBReserves();
  console.log("tokenBReserve", tokenBReserve);

  let tx1 = await token0.approve(TWAMMAddr, initialToken0Supply); //owner calls it
  await tx1.wait();
  tx1 = await token1.approve(TWAMMAddr, initialToken1Supply);
  await tx1.wait();
  tx1 = await twamm.addInitialLiquidity(
    token0Addr,
    token1Addr,
    initialToken0Supply,
    initialToken1Supply,
    timeStamp + 300
  );
  await tx1.wait();

  let [reserve0, reserve1] = await twamm.obtainReserves(token0.address, token1.address);

  console.log("reserve0: ", reserve0);
  console.log("reserve1: ", reserve1);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
