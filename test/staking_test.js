const { expect } = require("chai");
const { ethers,network } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");

let apex;
let esApex;
let amm;
let apexPool;
let alpPoolFactory;
let apexPoolFactory;
let router;
let quoteTokenAddress;
let alpPool;
let alpPoolAddress;
let apexPoolAddress;


async function main() {
    const [user1,user2] = await ethers.getSigners();

    let alpPoolFactoryAddress = "0x120566Baa2836bc12b0f850EDf066eEe5E217d54";
    let apexPoolFactoryAddress = "0xFfD1EdA0C751c047555184c4F06Dd3670bf1E913";

    alpPoolAddress = "0xCb67F8Ea0D0009B5848E592632D8385a3f2a4f1E";
    apexPoolAddress = "0xC5162134B9362860C1A44856724F9B5AfD803D56";

    // test 
    let ammAddress = "0x01A3eae4edD0512d7d1e3B57eCD40A1A1b1076EE";
    let marginAddress = "0xb6815C460ED87353Af9D7e84B46659A99aB2D6F6";
    let routerAddress = "0x70Db72c9C6e4e35db033Ecc965cceE8535d1f3Da";

    quoteTokenAddress = "0x79dcf515aa18399cf8fada58720fafbb1043c526";

    let esApexAddress = "0xff299dc55B1eDBA5D7E52f2c8d24f88C54d69DdD";
    let veApexAddress = "0xede883B3483C88806b4835c9389dA6e546C075a1";
    let apexAddress = "0x3f355c9803285248084879521AE81FF4D3185cDD";

    let artifactRouter = artifacts.readArtifactSync("IRouter");
    router = new ethers.Contract(routerAddress, artifactRouter.abi , user1 );

    let artifactApex = artifacts.readArtifactSync("MockToken");
    apex = new ethers.Contract(apexAddress, artifactApex.abi , user1 );

    let artifactEsApex = artifacts.readArtifactSync("EsAPEX");
    esApex = new ethers.Contract(esApexAddress, artifactEsApex.abi , user1 );

    let artifactAlpPoolFactory = artifacts.readArtifactSync("StakingPoolFactory");
    alpPoolFactory = new ethers.Contract(alpPoolFactoryAddress, artifactAlpPoolFactory.abi , user1 );
    
    let artifactAlpPool = artifacts.readArtifactSync("StakingPool");
    alpPool = new ethers.Contract(alpPoolAddress, artifactAlpPool.abi , user1 );
 
    let artifactAmm = artifacts.readArtifactSync("MockToken");
    amm = new ethers.Contract(ammAddress, artifactAmm.abi , user1 );

    let artifactApexPoolFactory = artifacts.readArtifactSync("StakingPoolFactory");
    apexPoolFactory = new ethers.Contract(apexPoolFactoryAddress, artifactApexPoolFactory.abi , user1 );
 
    let artifactApexPool = artifacts.readArtifactSync("StakingPool");
    apexPool = new ethers.Contract(apexPoolAddress, artifactApexPool.abi , user1 );

    let secSpanPerUpdate = await alpPoolFactory.secSpanPerUpdate();
    console.log("secSpanPerUpdate: ",secSpanPerUpdate.toString());

    let lastUpdateTimestamp = await alpPoolFactory.lastUpdateTimestamp();
    console.log("lastUpdateTimestamp: ",lastUpdateTimestamp.toString());

    let initTime = await alpPool.initTime();
    let endTime = await alpPool.endTime();
    console.log("initTime :",initTime.toString());
    console.log("endTime :",endTime.toString());
    await getUserLiquidity(user2);
    await usersAddETHLiquidity([user2],[100000]);

    // await getPoolInfo(alpPoolFactory);

    await approveForAlpStakingPool([user2]);

    await stakeAlpPool(user2,0.01,0,parseInt(secSpanPerUpdate) + 1,2);
    lastUpdateTimestamp = await alpPoolFactory.lastUpdateTimestamp();
    console.log("lastUpdateTimestamp: ",lastUpdateTimestamp.toString());


}

async function usersAddETHLiquidity(users,amounts) {
    console.log("Going to add liquidity");
    console.log(`user liquidity `)
    if(users.length != amounts.length){
        console.log("Sorry, please make sure users is equal to amounts");
        process.exit(1);
    }

    let dataLength = users.length;
    for(let i = 0;i < dataLength; i ++){
        let targetRouter = router.connect(users[i]);
        console.log(users[i].address);
        let liquidityAmount = ethers.utils.parseEther(amounts[i].toString());
        console.log("liquidityAmount :",liquidityAmount.toString())
        let addLiquidityRecipt = await targetRouter.addLiquidityETH(
            quoteTokenAddress,
            1,
            9654659289,
            false,
            {gasLimit: 99999999,
            value: liquidityAmount}
        );
        await addLiquidityRecipt.wait();
        console.log("After add liquidity==========")
        await getUserLiquidity(users[i]);
    }
}

async function approveForAlpStakingPool(users) {
    let dataLength = users.length;
    for(let i = 0;i < dataLength; i ++){
        let ammTarget = amm.connect(users[i]);
        let approveRecipt = await ammTarget.approve(alpPoolAddress,ethers.utils.parseEther("1000000000"));
        await approveRecipt.wait();
    }
}

async function getUserLiquidity(user) {
    let liquidityBalance = await amm.balanceOf(user.address);
    console.log(`User ${user.address} liquidity is: `,liquidityBalance/10**18);

    let totalLiquidity = await amm.totalSupply();
    console.log("Amm total liquidity: ",totalLiquidity/10**18);
}

async function getPoolInfo(poolFactory) {
    let apeXPerSec = await poolFactory.apeXPerSec();
    let secSpanPerUpdate = await poolFactory.secSpanPerUpdate();
    let lastUpdateTimestamp = await poolFactory.lastUpdateTimestamp();
    let endTimestamp = await poolFactory.endTimestamp();
    let priceOfWeight = await poolFactory.priceOfWeight()

    console.log("apeXPerSec: ",apeXPerSec/10**18);
    console.log("secSpanPerUpdate: ",secSpanPerUpdate.toString());
    console.log("lastUpdateTimestamp: ",lastUpdateTimestamp.toString());
    console.log("endTimestamp: ",endTimestamp.toString());
    console.log("priceOfWeight: ",priceOfWeight.toString());
}

async function stakeAlpPool(targetUser,targetStakeAmount,targetStakeDuration,timeSpan,loopCount) {
    let targetAlpPool = alpPool.connect(targetUser);
    let lastUpdateTimestamp = parseInt(await alpPoolFactory.lastUpdateTimestamp());
    for(let i=0;i<loopCount;i++){
        lastUpdateTimestamp = lastUpdateTimestamp + timeSpan;
        console.log("last time: ",lastUpdateTimestamp.toString())
        await network.provider.send("evm_setNextBlockTimestamp", [lastUpdateTimestamp]);
        // await network.provider.send("evm_increaseTime", [parseInt(timeSpan)]);
        let recipt = await targetAlpPool.stake(BigNumber.from((targetStakeAmount*10**18).toString()),targetStakeDuration,{gasLimit: 899999999});
        await recipt.wait();
        await getPoolInfo(alpPoolFactory);
    }

    console.log("After stake to Alp pool ======================");
    await printDepositeInfo(alpPool,targetUser);

}

async function printDepositeInfo(targetPool,targetUser){
    let [tokenAmount,totalWeight,subYieldRewards] = await targetPool.getStakeInfo(targetUser.address);
    console.log("tokenAmount: ",tokenAmount/10**18);
    console.log("totalWeight: ",totalWeight/(10**18*10**6));
    console.log("subYieldRewards: ",subYieldRewards/10**18);
    // // get length
    // let arrayLength = await targetPool.getDepositsLength(targetUser.address);
    // if(arrayLength > 0){
    //   console.log(`User deposits info =========== `);
    //   for(let i = 0;i < arrayLength; i++){
    //     let deposite = await targetPool.getDeposit(targetUser.address,i);
    //     console.log(`id : ${i} `);
    //     console.log(`tokenAmount : ${deposite.amount} `);
    //     console.log(`weight : ${deposite.weight} `);
    //     console.log(`lockFrom : ${deposite.lockFrom} `);
    //     console.log(`lockUntil : ${deposite.lockUntil} `);
    //     console.log();
    //   }
    // }
  }


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
