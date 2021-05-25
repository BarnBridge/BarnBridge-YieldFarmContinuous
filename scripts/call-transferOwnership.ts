import { contractAt } from '../test/helpers/helpers';
import { PoolSingle, PoolMulti, PoolFactoryMulti, PoolFactorySingle } from '../typechain';

const DAO = '0x4cAE362D7F227e3d306f70ce4878E245563F3069';

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

const factoryMultiAddr = '0x53a44A97cD2E9fb9d92ADe742a3C284695A4d72e';
const factorySingleAddr = '0x27FE2BFBb6be96D64Db0e741078A1f29Aa20226B';

async function main () {
    for (const p of poolsSingle) {
        const pool = (await contractAt('PoolSingle', p)) as PoolSingle;
        const tx = await pool.transferOwnership(DAO);
        await tx.wait();
    }

    for (const p of poolsMulti) {
        const pool = (await contractAt('PoolMulti', p)) as PoolMulti;
        const tx = await pool.transferOwnership(DAO);
        await tx.wait();
    }

    const factoryMulti = (await contractAt('PoolFactoryMulti', factoryMultiAddr)) as PoolFactoryMulti;
    let tx = await factoryMulti.transferOwnership(DAO);
    await tx.wait();


    const factorySingle = (await contractAt('PoolFactorySingle', factorySingleAddr)) as PoolFactorySingle;
    tx = await factorySingle.transferOwnership(DAO);
    await tx.wait();
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
