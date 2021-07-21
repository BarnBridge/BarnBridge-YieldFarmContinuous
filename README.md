# BarnBridge YieldFarm-Continuous
![](https://i.imgur.com/q42744q.png)

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

## Updating the config.ts file
### Create an API key with a Provider such as Infura to deploy to Ethereum Public Testnet. In this guide, we are using Kovan.

1. Navigate to [Infura.io](https://infura.io/) and create an account
2. Log in and select "Get started and create your first project to access the Ethereum network"
3. Create a project and name it appropriately; switch the Network to Kovan
4. Copy the URL from the settings page and paste it into the section labeled PROVIDER in the .env file
### Create an API key with Etherscan 
5. Navigate to [EtherScan](https://etherscan.io/) and create an account 
6. Log in and navigate to [MyAPIKey](https://etherscan.io/myapikey) 
7. Use the Add button to create an API key, and paste it into the section labeled ETHERSCAN in the .env file 
### Update the .env file with your test wallet information
5. Finally, insert the mnemonic phrase for your testing wallet. You can use a MetaMask instance, and switch the network to Kovan on the upper right. DO NOT USE YOUR PERSONAL METAMASK SEED PHRASE; USE A DIFFERENT BROWSER WITH AN INDEPENDENT METAMASK INSTALLATION
6. You'll need some Kovan-ETH (it is free) in order to pay the gas costs of deploying the contracts on the TestNet; you can use your GitHub account to authenticate to the [KovanFaucet](https://faucet.kovan.network/) and receive 2 Kovan-ETH for free every 24 hours


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

## Deploying to Kovan    

    npm run deploy-from-env

## Use additional scripts to change setup parameters and query functions
With the addresses given by the previous deployment, you can use the calculate-next-address.ts, calculate-rate.ts, and query-contracts.ts scripts to gather data, and use the setup.ts script to update parameters.

## Audits
- [Hacken](https://github.com/BarnBridge/BarnBridge-PM/blob/master/audits/BarnBridge%20Yield%20Farming%20Continuous%20audit%20by%20Hacken.pdf)

## Deployed contracts
### Mainnet

```shell
PoolFactory deployed at: 0x2e93403C675Ccb9C564edf2dC6001233d0650582

SY cUSDC pool deployed at: 0x68af34129755091e22f91899ceac48657e5a5062

SY crUSDC pool deployed at: 0x7f7D4dFd9733ae12e6a5991d42aF16418f227b6E
SY crUSDT pool deployed at: 0xEA32E4E751D49757906E1153eF7A30fCAb1b6462
SY crDAI pool deployed at: 0x707c1bD52C4718BF040f350F7FE6ba0AdB484E8d

SY aDAI pool deployed at: 0x69951B60B6253697F29c8311bFcEA6Da09BBac0d
SY aGUSD pool deployed at: 0xEAdFc8b994BF3eE23dC0033e6f11dEe4b166672E
SY aUSDC pool deployed at: 0xF4bde50CdF4ee4CF3FB8702fceb6fD499A92792d
SY aUSDT pool deployed at: 0x51d924bF2FF813a68BD5f86Cdcc98918f2AE5868

```

For information on deployed contracts, please see [Yield Farming Smart Contract Addresses](https://integrations.barnbridge.com/smart-contract-addresses) on our Developer Documentation.

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
