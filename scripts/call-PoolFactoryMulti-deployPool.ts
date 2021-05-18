import { calcRate, contractAt } from '../test/helpers/helpers';
import { PoolFactoryMulti } from '../typechain';
import { BigNumber } from 'ethers';

const zero = BigNumber.from(0);
const zeroAddress = '0x0000000000000000000000000000000000000000';

const factoryAddr = '0x33c3De5B470D196e4936847E999d9fE3296Ad7Cc';
const owner = '0xbbbbbbf2e986C085bF79d44BaCFA791C92b71fe8';

const pools = [
    {
        poolToken: '0xdfcb1c9d8209594cbc39745b274e9171ba4fd343',
        rewardTokens: [
            {
                tokenAddress: '0x521EE0CeDbed2a5A130B9218551fe492C5c402e4',
                rewardSource: '0xbbbbbbf2e986C085bF79d44BaCFA791C92b71fe8',
                rewardRate: calcRate(1000),
            },
            {
                tokenAddress: '0x4A69d0F05c8667B993eFC2b500014AE1bC8fD958',
                rewardSource: zeroAddress,
                rewardRate: zero,
            },
        ],
    },
    {
        poolToken: '0xe3d9c0ca18e6757e975b6f663811f207ec26c2b3',
        rewardTokens: [
            {
                tokenAddress: '0x521EE0CeDbed2a5A130B9218551fe492C5c402e4',
                rewardSource: '0xbbbbbbf2e986C085bF79d44BaCFA791C92b71fe8',
                rewardRate: calcRate(1000),
            },
            {
                tokenAddress: '0x4A69d0F05c8667B993eFC2b500014AE1bC8fD958',
                rewardSource: zeroAddress,
                rewardRate: zero,
            },
        ],
    },
];

async function main () {
    const factory = (await contractAt('PoolFactoryMulti', factoryAddr)) as PoolFactoryMulti;

    for (const p of pools) {
        await factory.deployPool(owner, p.poolToken, p.rewardTokens);
        const poolAddr = await factory.pools((await factory.numberOfPools()).sub(1));
        console.log(`Deployed pool for token ${p.poolToken} at address: ${poolAddr}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
