const verifyStr = "npx hardhat verify --network";

// let apeXToken = "0x61A1ff55C5216b636a294A07D77C6F4Df10d3B56"; // ArbitrumOne
let apeXToken = "0x3f355c9803285248084879521AE81FF4D3185cDD"; // Arbitrum Testnet
let merkleRoot = "0x0bcf838a06ebcf3f2fcb9065bf84b8fa2daefe4be5a5e0275e09cd62c624c070";
let merkleDistributor;

const main = async () => {
  await createMerkleDistributor();
};

async function createMerkleDistributor() {
  const MerkleDistributor = await ethers.getContractFactory("MerkleDistributor");
  merkleDistributor = await MerkleDistributor.deploy(apeXToken, merkleRoot);
  console.log("MerkleDistributor:", merkleDistributor.address);
  console.log(verifyStr, process.env.HARDHAT_NETWORK, merkleDistributor.address, apeXToken, merkleRoot);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
