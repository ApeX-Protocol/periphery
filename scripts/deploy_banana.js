const verifyStr = "npx hardhat verify --network";

let analyticMath;

const main = async () => {
  await createAnalyticMath();
};

async function createAnalyticMath() {
  const AnalyticMath = await ethers.getContractFactory("AnalyticMath");
  analyticMath = await AnalyticMath.deploy();
  await analyticMath.init();
  console.log("AnalyticMath:", analyticMath.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, analyticMath.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
