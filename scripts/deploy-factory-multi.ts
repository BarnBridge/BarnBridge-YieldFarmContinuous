import * as deploy from '../test/helpers/deploy';
import { PoolFactoryMulti } from '../typechain';

// const _owner = '0x89d652C64d7CeE18F5DF53B24d9D29D130b18798';
// matic
const _owner = '0x558Ef269Bcc4cc9F2e14E3f4301231fbeb85d95F';

async function main () {
    const factory = (
        await deploy.deployContract('PoolFactoryMulti', [_owner])
    ) as PoolFactoryMulti;

    console.log(`Factory deployed at: ${factory.address}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

