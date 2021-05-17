import * as deploy from '../test/helpers/deploy';
import { PoolFactorySingle } from '../typechain';

const _owner = '0x89d652C64d7CeE18F5DF53B24d9D29D130b18798';

async function main () {
    const factory = (
        await deploy.deployContract('PoolFactorySingle', [_owner])
    ) as PoolFactorySingle;

    console.log(`Factory deployed at: ${factory.address}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

