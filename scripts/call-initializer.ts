import { contractAt } from '../test/helpers/helpers';
import { PoolsInitializer } from '../typechain';

const initializerAddr = '0x19B2Cc0A829bDE567d7ADC5f95b08D43FE993b36';

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
