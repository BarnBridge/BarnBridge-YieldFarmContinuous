import * as deploy from '../test/helpers/deploy';
import { PoolFactorySingle } from '../typechain';

const _dao = '0x4cAE362D7F227e3d306f70ce4878E245563F3069';

async function main () {
    const factory = (
        await deploy.deployContract('PoolFactorySingle', [_dao])
    ) as PoolFactorySingle;

    console.log(`Pool deployed at: ${factory.address}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

