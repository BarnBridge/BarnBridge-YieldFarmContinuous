import { calcRate, contractAt } from '../test/helpers/helpers';
import { PoolFactoryMulti } from '../typechain';
import { BigNumber } from 'ethers';

const zero = BigNumber.from(0);
const zeroAddress = '0x0000000000000000000000000000000000000000';

const factoryAddr = '0x4d6DA23B67A90737757e03DDa48CDd89ADDbb845'; // from deploy-factory-multi.ts
const owner = '0x1CecFD44C68a1C76c3cB6dA88f8ECb2f4dB36347'; // from deploy-factory-multi.ts


const BOND = '0x521EE0CeDbed2a5A130B9218551fe492C5c402e4';// Kovan BOND token
const stkAAVE = '0xf2fbf9A6710AfDa1c4AaB2E922DE9D69E0C97fd2'; // Kovan stkAAVE
const cv = '0x96FcA2665f7696232B823726c497A2B9F7379aF1'; // from BarnBridge-YieldFarming/scripts/deploy-kovan.js

const pools = [
    {
        poolToken: '0xDfCB1C9d8209594cbc39745B274e9171Ba4fD343', // Kovan bb_aDAI
        rewardTokens: [
            {
                tokenAddress: BOND,
                rewardSource: cv,
                rewardRate: calcRate(2_500),
            },
            {
                tokenAddress: stkAAVE,
                rewardSource: zeroAddress,
                rewardRate: zero,
            },
        ],
    },
    {
        poolToken: '0xe3d9c0ca18e6757e975b6f663811f207ec26c2b3', // Kovan bb_aUSDT
        rewardTokens: [
            {
                tokenAddress: BOND,
                rewardSource: cv,
                rewardRate: calcRate(4_000),
            },
            {
                tokenAddress: stkAAVE,
                rewardSource: zeroAddress,
                rewardRate: zero,
            },
        ],
    },
];

async function main () {
    const factory = (await contractAt('PoolFactoryMulti', factoryAddr)) as PoolFactoryMulti;

    for (const p of pools) {
        await factory.deployPool(owner, p.poolToken, p.rewardTokens);
        const poolAddr = await factory.pools((await factory.numberOfPools()).sub(1));
        console.log(`Deployed pool for token ${p.poolToken} at address: ${poolAddr}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
