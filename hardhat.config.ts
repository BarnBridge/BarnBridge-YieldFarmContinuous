import { HardhatUserConfig, task } from 'hardhat/config';
import * as config from './config';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-abi-exporter';
import 'hardhat-typechain';
import 'solidity-coverage';
import 'hardhat-gas-reporter';

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (args, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(await account.getAddress());
    }
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
        only: ['YieldFarmContinuous'],
        except: ['.*Mock$'],
        clear: true,
        flat: true,
    },

    gasReporter: {
        enabled: (process.env.REPORT_GAS) ? true : false,
    },
};

export default cfg;
