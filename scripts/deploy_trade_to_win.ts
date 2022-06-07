import { ethers } from "hardhat";

async function main() {
  const ApeXTradeToWin = await ethers.getContractFactory("ApeXTradeToWin");
  const apeXTradeToWin = await ApeXTradeToWin.deploy("0x4eB450a1f458cb60fc42B915151E825734d06dd8");

  await apeXTradeToWin.deployed();

  console.log("ApeXTradeToWin deployed to:", apeXTradeToWin.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
