import * as deploy from '../test/helpers/deploy';
import { PoolFactory } from '../typechain';

const _dao = '0x930e52B96320d7dBbfb6be458e5EE0Cd3E5E5Dac';

async function main () {
    const factory = (
        await deploy.deployContract('PoolFactory', [_dao])
    ) as PoolFactory;

    console.log(`Pool deployed at: ${factory.address}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

