import * as deploy from '../test/helpers/deploy';
import { PoolsInitializer } from '../typechain';

const poolsMulti: string[] = [
    '0x8eBaea860D7A7853e9E84b4a8449245c4eB4de0B',
    '0x787Ee19b9Efd915Bdf3DCa19aCAc5F1b0e2B74aE',
    '0x46DC9860A6348B83a2Fa6Ae8Eff25318E769A7F0',
];
const poolsSingle: string[] = [
    '0x12544d725e7ffaeffbe00a4e4c66f319887cef43',
    '0x5e2Dfdc819B325D62Fb35ae145699d164a031eEd',
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

