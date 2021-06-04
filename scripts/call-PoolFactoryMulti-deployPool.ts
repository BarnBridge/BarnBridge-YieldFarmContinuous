import { calcRate, contractAt } from '../test/helpers/helpers';
import { PoolFactoryMulti } from '../typechain';
import { BigNumber } from 'ethers';

const zero = BigNumber.from(0);
const zeroAddress = '0x0000000000000000000000000000000000000000';

const factoryAddr = '0x53a44A97cD2E9fb9d92ADe742a3C284695A4d72e';
const owner = '0x89d652C64d7CeE18F5DF53B24d9D29D130b18798';

const BOND = '0x0391D2021f89DC339F60Fff84546EA23E337750f';
const stkAAVE = '0x4da27a545c0c5B758a6BA100e3a049001de870f5';
const cv = '0xA3C299eEE1998F45c20010276684921EBE6423D9';

const pools = [
    {
        poolToken: '0x6c9DaE2C40b1e5883847bF5129764e76Cb69Fc57', // bb_aDAI
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
        poolToken: '0x6324538cc222b43490dd95CEBF72cf09d98D9dAe', // bb_aGUSD
        rewardTokens: [
            {
                tokenAddress: BOND,
                rewardSource: cv,
                rewardRate: calcRate(500),
            },
            {
                tokenAddress: stkAAVE,
                rewardSource: zeroAddress,
                rewardRate: zero,
            },
        ],
    },
    {
        poolToken: '0x3cf46DA7D65E9aa2168a31b73dd4BeEA5cA1A1f1', // bb_aUSDC
        rewardTokens: [
            {
                tokenAddress: BOND,
                rewardSource: cv,
                rewardRate: calcRate(10_000),
            },
            {
                tokenAddress: stkAAVE,
                rewardSource: zeroAddress,
                rewardRate: zero,
            },
        ],
    },
    {
        poolToken: '0x660dAF6643191cF0eD045B861D820F283cA078fc', // bb_aUSDT
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
