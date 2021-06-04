import * as deploy from '../test/helpers/deploy';
import { PoolsInitializer } from '../typechain';

const poolsMulti: string[] = [
    '0xAeCbB86544Dc8cD4c99E8C130014Cb1da95347b8',
    '0xAeCbB86544Dc8cD4c99E8C130014Cb1da95347b8',
];
const poolsSingle: string[] = [
    '0xa21DA618cF10c03e4C50A1f7C6EA17FC39642dd1',
    '0x57b21FB8c1bBE47666215CD567c98151CB09282d',
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

