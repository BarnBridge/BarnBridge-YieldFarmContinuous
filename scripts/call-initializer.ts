import { contractAt } from '../test/helpers/helpers';
import { PoolsInitializer } from '../typechain';

const initializerAddr = '0x6a27a65E45E9d344167A3cde1494955830a718d2';

async function main () {
    const initializer = (await contractAt('PoolsInitializer', initializerAddr)) as PoolsInitializer;
    console.log(await initializer.pullAll());
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
