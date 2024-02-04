require("dotenv").config();
require("hardhat-deploy");
require("@nomiclabs/hardhat-waffle");
require("hardhat-watcher");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("@openzeppelin/hardhat-upgrades");

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.2",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.4",
      },
    ],
  },
  mocha: {
    timeout: 600000,
  },

  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    localhost: {
      url: "http://localhost:8545",
    },
    mainnet: {
      url: process.env.MAINNET_RPC,
      accounts: process.env.DEVNET_PRIVKEY !== undefined ? [process.env.DEVNET_PRIVKEY] : [],
    },
    sepolia: {
       url: process.env.SEPOLIA_RPC,
       accounts: process.env.DEVNET_PRIVKEY !== undefined ? [process.env.DEVNET_PRIVKEY] : [],
     },
     mantleTestnet: {
         chainId: 5001,
         url: process.env.MANTLE_TESTNET_RPC_URL,
         accounts: process.env.DEVNET_PRIVKEY !== undefined ? [process.env.DEVNET_PRIVKEY] : [],
       },
       mantle: {
         chainId: 5000,
         url: process.env.MANTLE_MAINNET_RPC_URL,
         accounts: process.env.MAINNET_PRIVKEY !== undefined ? [process.env.MAINNET_PRIVKEY] : [],
       }
     },
     etherscan: {
       apiKey: process.env.ETHERSCAN_API_KEY,
       customChains: [{
           network: "mantle",
           chainId: Number(process.env.MANTLE_MAINNET_CHAIN_ID),
           urls: {
             apiURL: `${process.env.MANTLE_MAINNET_EXPLORER}api`,
             browserURL: process.env.MANTLE_MAINNET_EXPLORER,
           },
         },
         {
           network: "mantleTestnet",
           chainId: Number(process.env.MANTLE_TESTNET_CHAIN_ID),
           urls: {
             apiURL: `${process.env.MANTLE_TESTNET_EXPLORER}api`,
             browserURL: process.env.MANTLE_TESTNET_EXPLORER,
           },
         },
       ],
     },
    watcher: {
      compilation: {
        tasks: ["compile"],
      },
      test: {
        tasks: ["test"],
        files: ["./test/*"],
      },
    },
};
