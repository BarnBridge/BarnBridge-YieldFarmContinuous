import { contractAt } from '../test/helpers/helpers';
import { PoolFactoryMulti } from '../typechain';
import { BigNumber } from 'ethers';

const factoryAddr = '0x45785bbdb31587dC206F6FE58e2DcFaE71ac40a1';

const owner = '0xbbbbbbf2e986C085bF79d44BaCFA791C92b71fe8';
const poolToken = '0xEa8BE82DF1519D4a25E2539bcA0342a1203CD591';
const rewardTokens = [
    {
        tokenAddress: '0x521EE0CeDbed2a5A130B9218551fe492C5c402e4',
        rewardSource: '0xB56ccaD94c714c3Ad1807EB3f5d651C7633BB252',
        rewardRate: BigNumber.from('16534391534391534'),
    },
    {
        tokenAddress: '0x4A69d0F05c8667B993eFC2b500014AE1bC8fD958',
        rewardSource: '0x0000000000000000000000000000000000000000',
        rewardRate: BigNumber.from(0),
    },
];

async function main () {
    const factory = (await contractAt('PoolFactoryMulti', factoryAddr)) as PoolFactoryMulti;

    await factory.deployPool(owner, poolToken, rewardTokens);

    const pool = await factory.pools((await factory.numberOfPools()).sub(1));
    console.log(`Deployed pool at address: ${pool}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
