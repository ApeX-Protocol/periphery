require("@nomiclabs/hardhat-etherscan");

const main = async () => {
    const accounts = await hre.ethers.getSigners();
    let signer = accounts[0].address;
    console.log("signer address:%s", signer);

   const owner = "0xf73546Da2F971bD0Ed1b3c5F9C01092180Db5089";
   const apeXToken = "0x96630b0D78d29E7E8d87f8703dE7c14b2d5AE413";
   const treasury = "0xf73546Da2F971bD0Ed1b3c5F9C01092180Db5089";
   const vestTime = 180 * 24 * 3600;
   const forceWithdrawMinRemainRatio = 1666;

    await hre.run("verify:verify", {
        address: "0x51fCAAF4d6288f21ceDdA92f22A3C0251e8f1870",
        contract: "contracts/stakingV2/EsAPEX2.sol:EsAPEX2",
        constructorArguments: [
            owner,
            apeXToken,
            treasury,
            vestTime,
            forceWithdrawMinRemainRatio
        ],
    });
};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
