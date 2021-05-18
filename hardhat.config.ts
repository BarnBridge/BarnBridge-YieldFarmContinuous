import { HardhatUserConfig, task } from 'hardhat/config';
import * as config from './config';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-abi-exporter';
import 'hardhat-typechain';
import 'solidity-coverage';
import 'hardhat-gas-reporter';
import { BigNumber } from 'ethers';

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (args, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(await account.getAddress());
    }
});

task('verify-initializer', 'verifies', async (args, hre) => {
    const poolsMulti: string[] = [
        '0x69951B60B6253697F29c8311bFcEA6Da09BBac0d',
        '0xEAdFc8b994BF3eE23dC0033e6f11dEe4b166672E',
        '0xF4bde50CdF4ee4CF3FB8702fceb6fD499A92792d',
        '0x51d924bF2FF813a68BD5f86Cdcc98918f2AE5868',
    ];
    const poolsSingle: string[] = [
        '0x707c1bD52C4718BF040f350F7FE6ba0AdB484E8d',
        '0x7f7D4dFd9733ae12e6a5991d42aF16418f227b6E',
        '0xEA32E4E751D49757906E1153eF7A30fCAb1b6462',
    ];

    await hre.run('verify:verify', {
        address: '0x19B2Cc0A829bDE567d7ADC5f95b08D43FE993b36',
        constructorArguments: [poolsMulti, poolsSingle],
    });
});

// Some of the settings should be defined in `./config.js`.
// Go to https://hardhat.org/config/ for the syntax.
const cfg: HardhatUserConfig = {
    solidity: {
        version: '0.7.6',
        settings: {
            optimizer: {
                enabled: true,
                runs: 9999,
            },
        },
    },

    defaultNetwork: 'hardhat',

    networks: config.networks,
    etherscan: config.etherscan,

    abiExporter: {
        only: ['Pool'],
        except: ['.*Mock$'],
        clear: true,
        flat: true,
    },

    gasReporter: {
        enabled: (process.env.REPORT_GAS) ? true : false,
    },
};

export default cfg;
