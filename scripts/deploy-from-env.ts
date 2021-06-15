import * as deploy from '../test/helpers/deploy';
import { PoolFactorySingle, PoolFactoryMulti, PoolsInitializer, Erc20Mock } from '../typechain';
import { contractAt, tenPow18, calcRate } from '../test/helpers/helpers';
import { BigNumber } from 'ethers';

require('dotenv').config();

const zero = BigNumber.from(0);
const zeroAddress = '0x0000000000000000000000000000000000000000';
const owner = process.env.OWNER;
const reward_token = process.env.BOND
const reward_source = process.env.REWARD_SOURCE
const cv = process.env.CV;
const BOND = process.env.BOND;
const stkAAVE = process.env.STKAAVE;
const bb_crusdc = process.env.BB_CRUSDC;
const bb_ausdt = process.env.BB_AUSDT;
const bb_adai = process.env.BB_ADAI;
const bb_crusdc_weekly_amount = Number(process.env.BB_CRUSDC_WEEKLY_AMOUNT);
const bb_ausdt_weekly_amount = Number(process.env.BB_AUSDT_WEEKLY_AMOUNT);
const bb_adai_multi_rate = Number(process.env.BB_ADAI_MULTI_RATE);
const bb_ausdt_multi_rate = Number(process.env.BB_AUSDT_MULTI_RATE);

const pools_single = [
    {
        tokenAddr: bb_crusdc,
        weeklyAmount: bb_crusdc_weekly_amount,
    },
    {
        tokenAddr: bb_ausdt,
        weeklyAmount: bb_ausdt_weekly_amount,
    },
];

const pools_multi = [
    {
        poolToken: bb_adai, // bb_aDAI
        rewardTokens: [
            {
                tokenAddress: BOND,
                rewardSource: cv,
                rewardRate: calcRate(bb_adai_multi_rate),
            },
            {
                tokenAddress: stkAAVE,
                rewardSource: zeroAddress,
                rewardRate: zero,
            },
        ],
    },
    {
        poolToken: bb_ausdt, // bb_aUSDT
        rewardTokens: [
            {
                tokenAddress: BOND,
                rewardSource: cv,
                rewardRate: calcRate(bb_ausdt_multi_rate),
            },
            {
                tokenAddress: stkAAVE,
                rewardSource: zeroAddress,
                rewardRate: zero,
            },
        ],
    },
    // TODO: bb_aUSDG not yet deployed on Kovan
    // TODO: bb_aUSDC not yet deployed on Kovan
];

async function main () {
    var poolsSingle: string[] = [];
    var poolsMulti: string[] = [];

    // Deploy Single Pool Factory	
    const factory = (
        await deploy.deployContract('PoolFactorySingle', [owner])
    ) as PoolFactorySingle;
    console.log(`Single Token Pool Factory deployed at: ${factory.address}`);

    // For each pool in pools call deployPool 
    for (const p of pools_single) {
        await factory.deployPool(owner, reward_token, p.tokenAddr, reward_source, calcRate(p.weeklyAmount));
        const poolAddrSingle = await factory.pools((await factory.numberOfPools()).sub(1));
        console.log(`Deployed single-pool for token ${p.tokenAddr} at address: ${poolAddrSingle}`);
	poolsSingle.push(poolAddrSingle);
    }

    // Deploy Multi Pool Factory
    const factoryMulti = (
        await deploy.deployContract('PoolFactoryMulti', [owner])
    ) as PoolFactoryMulti;
    console.log(`Multi Token Pool Factory deployed at: ${factoryMulti.address}`);

    // For each pool in poolsMulti call deployPool
    for (const q of pools_multi) {
        await factoryMulti.deployPool(owner, q.poolToken, q.rewardTokens);
        const poolAddrMulti = await factoryMulti.pools((await factoryMulti.numberOfPools()).sub(1));
        console.log(`Deployed multi-pool for token ${q.poolToken} at address: ${poolAddrMulti}`);
	poolsMulti.push(poolAddrMulti);
    }

    // Deploy Pools Initializer
    const initializer = (
        await deploy.deployContract('PoolsInitializer', [poolsMulti, poolsSingle])
    ) as PoolsInitializer;
    console.log(`Initializer deployed at: ${initializer.address}`);

    // Call Pool Initializer
    console.log(await initializer.pullAll());

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

