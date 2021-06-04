import * as deploy from '../test/helpers/deploy';
import { PoolFactory } from '../typechain';

const _dao = '0xB011D306D36c396847bA42b1c7AEb8E96C540d9a';

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

