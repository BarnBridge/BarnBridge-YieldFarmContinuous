import * as deploy from '../test/helpers/deploy';
import { PoolFactory } from '../typechain';

const _dao = '0x930e52B96320d7dBbfb6be458e5EE0Cd3E5E5Dac';

async function main () {
    const factory = (
        await deploy.deployContract('PoolFactory')
    ) as PoolFactory;

    console.log(`Pool deployed at: ${factory.address}`);

    console.log(`Transferring ownership to ${_dao}`);
    await factory.transferOwnership(_dao);
    console.log('Done!');
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

