import * as deploy from '../test/helpers/deploy';
import { PoolFactoryMulti } from '../typechain';

const _dao = '0xbbbbbbf2e986C085bF79d44BaCFA791C92b71fe8';

async function main () {
    const factory = (
        await deploy.deployContract('PoolFactoryMulti', [_dao])
    ) as PoolFactoryMulti;

    console.log(`Factory deployed at: ${factory.address}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

