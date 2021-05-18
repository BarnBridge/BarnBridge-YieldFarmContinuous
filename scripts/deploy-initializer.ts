import * as deploy from '../test/helpers/deploy';
import { PoolsInitializer } from '../typechain';

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

async function main () {
    const initializer = (
        await deploy.deployContract('PoolsInitializer', [poolsMulti, poolsSingle])
    ) as PoolsInitializer;

    console.log(`Initializer deployed at: ${initializer.address}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

