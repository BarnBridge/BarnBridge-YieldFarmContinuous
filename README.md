# BarnBridge YieldFarm-Continuous

Implements single and multi-token rewards pools with continuous rewards

Any questions? Please contact us on [Discord](https://discord.gg/FfEhsVk) or read our [Developer Guides](https://integrations.barnbridge.com/) for more information.

##  Contracts
### single-reward-token/PoolSingle.sol
Allows users to deposit, withdraw, claim, and withdrawAndClaim from the single-token reward pools
### single-reward-token/PoolFactorySingle.sol
Used to Deploy single-token rewards pools
### single-reward-token/GovernedSingle.sol
Allows Owner to set reward source address and reward rates per second
### multi-reward-token/PoolMulti.sol
Allows users to deposit, withdraw, claim, and withdrawAndClaim from the multi-token reward pools
### multi-reward-token/PoolFactoryMulti.sol
Used to Deploy multi-token rewards pools
### multi-reward-token/GovernedMulti.sol
Allows Owner to approve new reward tokens, set the reward source address and reward rates per second

## Smart Contract Architecture
Overview

![Junior Pool](https://gblobscdn.gitbook.com/assets%2F-MIu3rMElIO-jG68zdaV%2F-MXHutr14sDo0hYi6gg3%2F-MXHwLedyIac7BAL_YJO%2Fjunior%20tokens.png?alt=media&token=607fe998-db46-47e1-8c24-397630103da2)

Check out more detailed smart contract Slither graphs with all the dependencies: [YieldFarm-Continuous Slither Graphs](https://github.com/BarnBridge/sc-graphs/tree/main/BarnBridge-YieldFarmContinuous).


## Initial Setup
### Install NVM and the latest version of NodeJS 12.x
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash 
    # Restart terminal and/or run commands given at the end of the installation script
    nvm install 12
    nvm use 12
### Use Git to pull down the BarnBridge-SmartYieldBonds repository from GitHub
    git clone https://github.com/BarnBridge/BarnBridge-DAO.git
    cd BarnBridge-YieldFarming
### Create config.ts using the sample template config.sample.ts
    cp config.sample.ts config.ts

## Updating the config.ts file
### Create an API key with Infura to deploy to Ethereum Public Testnet. In this guide, we are using Kovan.

1. Navigate to [Infura.io](https://infura.io/) and create an account
2. Log in and select "Get started and create your first project to access the Ethereum network"
3. Create a project and name it appropriately
4. Then, switch the endpoint to Rinkeby, copy the https URL and paste it into the section named `rinkeby` 
5. Finally, insert the mnemonic phrase for your testing wallet. You can use a MetaMask instance, and switch the network to Rinkeby on the upper right. DO NOT USE YOUR PERSONAL METAMASK SEED PHRASE; USE A DIFFERENT BROWSER WITH AN INDEPENDENT METAMASK INSTALLATION
6. You'll need some Kovan-ETH (it is free) in order to pay the gas costs of deploying the contracts on the TestNet; you can use your GitHub account to authenticate to the [KovanFaucet](https://faucet.kovan.network/) and receive 2 Kovan-ETH for free every 24 hours

### Create an API key with Etherscan 
1. Navigate to [EtherScan](https://etherscan.io/) and create an account 
2. Log in and navigate to [MyAPIKey](https://etherscan.io/myapikey) 
3. Use the Add button to create an API key, and paste it into the indicated section towards the bottom of the `config.ts` file

### Verify contents of config.ts; it should look like this:

```js
        import { NetworksUserConfig } from "hardhat/types";
        import { EtherscanConfig } from "@nomiclabs/hardhat-etherscan/dist/src/types";

        export const networks: NetworksUserConfig = {
            // Needed for `solidity-coverage`
            coverage: {
                url: "http://localhost:8555"
            },

            // Kovan
            kovan: {
                url: "https://kovan.infura.io/v3/INFURA-API-KEY",
                chainId: 42,
                accounts: {
                    mnemonic: "YourKovanTestWalletMnemonicPhrase",
                    path: "m/44'/60'/0'/0",
                    initialIndex: 0,
                    count: 10
                },
                gas: 3716887,
                gasPrice: 20000000000, // 20 gwei
                gasMultiplier: 1.5
            },

            // Mainnet
            mainnet: {
                url: "https://mainnet.infura.io/v3/YOUR-INFURA-KEY",
                chainId: 1,
                accounts: ["0xaaaa"],
                gas: "auto",
                gasPrice: 50000000000,
                gasMultiplier: 1.5
            }
        };

        // Use to verify contracts on Etherscan
        // https://buidler.dev/plugins/nomiclabs-buidler-etherscan.html
        export const etherscan: EtherscanConfig = {
            apiKey: "YourEtherscanAPIKey"
        };

```
## Installing

### Install NodeJS dependencies which include HardHat
    npm install
    
### Compile the contracts
    npm run compile
    
## Running Tests
    npm run test

**Note:** The result of tests is readily available [here](./test-results.md).
## Running Code Coverage Tests
    npm run coverage

    
### Use deploy-factory.ts to deploy the Single-Token Pool Factory
Update line 4 (_owner) of the scripts/deploy-factory.ts file with your own Kovan test wallet address

    npx hardhat run --network kovan scripts/deploy-factory.js # outputs single token pool factory address
    
### Use deploy-factory-multi.ts to deploy the Multi-Token Pool Factory
Update line 4 (_dao) of the scripts/deploy-factory-multi.ts file with your own Kovan test wallet address

    npx hardhat run --network kovan scripts/deploy-factory-multi.js # outputs multi token pool factory address
    
### Use call-PoolFactorySingle-deployPool-kovan.ts to call the Single-Token Pool initilizer
Update line 5 in the scripts/call-PoolFactorySingle-deployPool-kovan.ts file with the address given by deploy-factory.ts
Update line 6 in the scripts/call-PoolFactorySingle-deployPool-kovan.ts file with your own Kovan test wallet address
Update line 23 in the scripts/call-PoolFactorySingle-deployPool-kovan.ts file with your own Kovan test wallet address
**NOTE:** in order to test distribution of rewards, your Kovan wallet must contain Kovan-BOND; contact the Integrations Team for distribution

    npx hardhat run --network kovan scripts/call-PoolFactorySingle-deployPool-kovan.ts
    
Note the output addresses of the two Single-Token Pools to be used in the call to deploy-initializer-kovan.ts

 
### Use call-PoolFactoryMulti-deployPool-kovan.ts to call the Multi-Token Pool initilizer
Update line 8 in the scripts/call-PoolFactoryMulti-deployPool-kovan.ts file with the address given by deploy-factory-multi.ts
Update line 9 in the scripts/call-PoolFactoryMulti-deployPool-kovan.ts file with your own Kovan test wallet address
Update line 14 in the scripts/call-PoolFactoryMulti-deployPool-kovan.ts file with either your own deployment of the Community Vault from BarnBridge-YieldFarming/scripts/deploy-kovan.js or the BarnBridge Kovan Community Vault at 0xB56ccaD94c714c3Ad1807EB3f5d651C7633BB252
**NOTE:** in order to test distribution of rewards, your Kovan wallet must contain Kovan-BOND; contact the Integrations Team for distribution

    npx hardhat run --network kovan scripts/call-PoolFactoryMulti-deployPool-kovan.ts

Note the output addresses of the two Multi-Token Pools to be used in the call to deploy-initializer-kovan.ts

### Use deploy-initializer-kovan.ts to deploy the initializer
Update lines 5 and 6 of the scripts/deploy-initializer-kovan.ts file with the two Multi-Token Pools addresses generated by call-PoolFactoryMulti-deployPool-kovan.ts
Update lines 9 and 10 of the scripts/deploy-initializer-kovan.ts file with the two Single-Token Pools addresses generated by call-PoolFactorySingle-deployPool-kovan.ts

    npx hardhat run --network kovan scripts/deploy-initializer-kovan.ts # gives address of initializer

### Use call-initializer.ts to call the initializer
Update line 4 of scripts/call-initializer.ts with the address given by deploy-initializer-kovan.ts

    npx hardhat run --network kovan scripts/call-initializer.ts
    
### Use deploy.ts to deploy the bb_cUSDC pool
Update line 4 of the scripts/deploy.ts file with your your Kovan test wallet address.
    
    npx hardhat run --network kovan scripts/deploy.ts
## Use additional scripts to change setup parameters and query functions
With the addresses given by the previous deployments, you can use the calculate-next-address.ts, calculate-rate.ts, and query-contracts.ts scripts to gather data, and use the setup.ts script to update parameters.

## Audits
- [Hacken](https://github.com/BarnBridge/BarnBridge-PM/blob/master/audits/BarnBridge%20Yield%20Farming%20Continuous%20audit%20by%20Hacken.pdf)

## Deployed contracts
### Mainnet
```shell
PoolFactory deployed at: 0x2e93403C675Ccb9C564edf2dC6001233d0650582
SY cUSDC pool deployed at: 0x68af34129755091e22f91899ceac48657e5a5062
```

## Known issues

### Pool reactivation
**Severity: low**

After a pool has exhausted its allowance on the `rewardSource`, it will not attempt to pull any more tokens.

The problem with the above is that `lastSoftPullTs` is not updated anymore due to 0 allowance.

If, at a later time, the pool is given more allowance on the `rewardSource`, it will calculate the amount to pull as if it was never stopped which will trigger it to pull tokens for the whole period it was paused at the same rate.

The following actions would act as a workaround for the above issue:
1. set the allowance to a very small number like `1`
2. trigger a `softPullReward()` -- this would effectively pull only the allowance given and update the `lastSoftPullTs`
3. set the allowance to the desired value

## Discussion
For any concerns with the platform, open an issue on GitHub or visit us on [Discord](https://discord.gg/9TTQNUzg) to discuss.
For security concerns, please email info@barnbridge.com.

Copyright 2021 BarnBridge DAO
