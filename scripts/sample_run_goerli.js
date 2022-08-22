const hre = require("hardhat");
const ethers = hre.ethers;


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
  const continualLPSupply = ethers.utils.parseUnits("10000");
  const instantSwapAmount = ethers.utils.parseUnits("1");
  let termSwapAmount = ethers.utils.parseUnits("1");
  const numIntervalUnits = 100;
  //usdc
  const token0Addr = "0x39C6E50227cBd9Bc80b18f1F918d73C91B44293c";
  const token0 = await ethers.getContractAt("contracts/interfaces/IERC20.sol:IERC20", token0Addr);
  //Banana
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
  try {
    let tx = await twamm.createPairWrapper(token0Addr, token1Addr, timeStamp+100);
    await tx.wait();
    console.log("create pair successfully");
  } catch (error) {
   
    console.log('continute without pair creation, the pair might be created already.');
  }
  const pairAddr = await twamm.obtainPairAddress(token0Addr, token1Addr);
  console.log('pair address check', pairAddr);

  sleep(10000)

  try {
    console.log('add initial liquidity')
    let pairContract = await ethers.getContractAt('IPair', pairAddr);
    let lpamount = await pairContract.getTotalSupply();
    console.log("lpamount", lpamount);

    let tokenAReserve = await pairContract.tokenAReserves();
    console.log("tokenAReserve", tokenAReserve);
    let tokenBReserve = await pairContract.tokenBReserves();
    console.log("tokenBReserve", tokenBReserve);

    let tx1 = await token0.approve(pairAddr, initialLPSupply); //owner calls it
    await tx1.wait();
    tx1 =await token1.approve(pairAddr, initialLPSupply);
    await tx1.wait();
    tx1 = await twamm.addInitialLiquidity(
        token0Addr,
        token1Addr,
        initialLPSupply,
        initialLPSupply,
        timeStamp + 300
      );
    await tx1.wait();
  } catch (error) {
    // console.log(error);
    console.log('initial liquidity might be provided, add more liquidity instead.');
    //uncomment below to enable add liquidity
   const newLPTokens = continualLPSupply;
    const allowance = ethers.utils.parseUnits("100000");
    tx1 = await token0.approve(pairAddr, allowance);
    await tx1.wait();
    tx1 = await token1.approve(pairAddr, allowance);
    await tx1.wait();

    tx1 = await twamm.addLiquidity(
        token0Addr,
        token1Addr,
        newLPTokens,
        timeStamp + 500
      );
    await tx1.wait();

  }

 let [reserve0,reserve1 ] =  await twamm.obtainReserves(token0.address, token1.address);

 console.log("reserve0: ",reserve0);
 console.log("reserve1: ",reserve1);

// perform instant swap
// console.log('instant swap');
// await token0.approve(pairAddr, instantSwapAmount);
// await twammInstantSwap.instantSwapTokenToToken(
//     token0.address,
//     token1.address,
//     instantSwapAmount,
//     timeStamp + 700
// );

// perform term swap
let pair = await ethers.getContractAt('IPair', pairAddr);

/////////////////first part: for cancel order //////////////////
// console.log('term swap');
// termSwapAmount = ethers.utils.parseUnits("2");
// let tx = await token0.approve(pairAddr, termSwapAmount);
// await tx.wait();
// console.log("------------")
// let temp = await token0.allowance(account.getAddress(), pairAddr);
// console.log("approve: ", temp.toString());
// await twammTermSwap.longTermSwapTokenToToken(
//     token0.address,
//     token1.address,
//     termSwapAmount,
//     numIntervalUnits,
//     timeStamp + 900
// );

// await sleep(10000);

// console.log('get order Ids');
// let orderIds = await pair.userIdsCheck(account.getAddress());
// let s = Object.values(Object.keys(orderIds))[Object.keys(orderIds).length-1] ;
// console.log("s: ", s); 
// console.log('cancel order ', orderIds);
// currentBlockNumber = await ethers.provider.getBlockNumber();
// timeStamp = (await ethers.provider.getBlock(currentBlockNumber)).timestamp;
// await twammTermSwap.cancelTermSwapTokenToToken(
//             token0.address,
//             token1.address,
//             Object.values(Object.keys(orderIds))[Object.keys(orderIds).length-1],
//           // orderIds[0],
//             timeStamp + 100
//           );

/////////////////second part: for order withdrawal//////////////////
console.log('term swap');
let tx = await token0.approve(pairAddr, termSwapAmount);
await tx.wait();
tx = await twamm.longTermSwapTokenToToken(
              token0.address,
              token1.address,
              termSwapAmount,
              numIntervalUnits,
              timeStamp + 300
          );
await tx.wait();

await sleep(10000);        
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

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
