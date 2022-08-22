const hre = require("hardhat");
const ethers = hre.ethers;

//goerli
async function main() {
  // if (hre.network.name === "mainnet") {
  //   console.log("Deploying TWAMM to mainnet. Hit ctrl + c to abort");
  // }

  const [account] = await ethers.getSigners();
  console.log(
    "Account Address:",
    await account.getAddress()
  );

  console.log("Account balance:", (await account.getBalance()).toString());

  //some hyperparameters
  const initialLPSupply = ethers.utils.parseUnits("10");
  const continualLPSupply = ethers.utils.parseUnits("1");
  const instantSwapAmount = ethers.utils.parseUnits("1");
  let termSwapAmount = ethers.utils.parseUnits("1");
  const numIntervalUnits = 100;
  const token0Addr = "0x39C6E50227cBd9Bc80b18f1F918d73C91B44293c";
  const token0 = await ethers.getContractAt("contracts/interfaces/IERC20.sol:IERC20", token0Addr);
  const token1Addr = "0xAed97054763C0785F73408E0b642F28E2DeD836a";
  const token1 = await ethers.getContractAt("contracts/interfaces/IERC20.sol:IERC20", token1Addr);

  // loading necessary contracts
  const TWAMMAddr = "0x4cd67eCeA6de68206C2E7c4716EdD2a25d2d4e84";
  const twamm = await ethers.getContractAt("ITWAMM", TWAMMAddr);

  const sleep = ms => new Promise(res => setTimeout(res, ms));

  
  
  //provide (initial) liquidity
  let currentBlockNumber = await ethers.provider.getBlockNumber();
  let timeStamp = (await ethers.provider.getBlock(currentBlockNumber)).timestamp;
  console.log('current block number', timeStamp);
  
  const pairAddr = await twamm.obtainPairAddress(token0Addr, token1Addr);
  console.log('pair address check', pairAddr);

  // sleep(10000)

// let [reserve0,reserve1 ] =  await twamm.obtainReserves(token0.address, token1.address);

//  console.log("reserve0: ",reserve0.div("1000000000000000"));
//  console.log("reserve1: ",reserve1.div("1000000000000000"));

// perform term swap
let pair = await ethers.getContractAt('IPair', pairAddr);

/////////////////first part: for cancel order //////////////////
// console.log('term swap');
// // termSwapAmount = ethers.utils.parseUnits("2");
// let tx = await token0.approve(pairAddr, termSwapAmount);
// await tx.wait();

// console.log("------------ term swqp 1, 100个区块完成  ")
// // let temp = await token0.allowance(account.getAddress(), pairAddr);
// // console.log("approve: ", temp.toString());
// await twammTermSwap.longTermSwapTokenToToken(
//     token0.address,
//     token1.address,
//     termSwapAmount,
//     numIntervalUnits,
//     timeStamp + 900
// );

//await sleep(10000);
console.log("------------ term swqp 1, 100个区块完成, 10秒后  ")

  orderIds = await pair.userIdsCheck(account.getAddress());
  console.log('withdraw order');
  tx1 = await twamm.withdrawProceedsFromTermSwapTokenToToken(
    token0.address,
    token1.address,
    Object.values(Object.keys(orderIds))[Object.keys(orderIds).length-1],
    timeStamp + 500
    );
  await tx1.wait();
  let [reserve2,reserve3 ] =  await twamm.obtainReserves(token0.address, token1.address);

  console.log("reserve0: ",reserve2);
  console.log("reserve1: ",reserve3);
  
// console.log("------------ term swqp 1token, 100个区块完成, 60秒后  ")
// let [reserve4,reserve5 ] =  await twamm.obtainReserves(token0.address, token1.address);

//  amount0 =   await  pair.reserveMap(token0.address);
//  amount1 =   await  pair.reserveMap(token1.address);





  //  console.log("reserve0: ",reserve4.div("1000000000000000"));
  //  console.log("reserve1: ",reserve5.div("1000000000000000"));
  //  console.log("amount0: ",amount0.div("1000000000000000"));
  //  console.log("amount1: ",amount1.div("1000000000000000"));

// console.log('get order Ids');
// let orderIds = await pair.userIdsCheck(account.getAddress());
// let s = Object.values(Object.keys(orderIds))[Object.keys(orderIds).length-1] ;
// console.log("s: ", s); 
// console.log('cancel order ', orderIds);
// currentBlockNumber = await ethers.provider.getBlockNumber();
// timeStamp = (await ethers.provider.getBlock(currentBlockNumber)).timestamp;


}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
