import { contractAt, tenPow18 } from '../test/helpers/helpers';
import { PoolFactorySingle, Erc20Mock } from '../typechain';
import { BigNumber } from 'ethers';

const factoryAddr = '0xF97deb8d6DFbd69cb7F6bCAb57f71f8397F5F6E8';
const owner = '0xbbbbbbf2e986C085bF79d44BaCFA791C92b71fe8';

const pools = [
    {
        tokenAddr: '0x53ffd02bda592e89fd5f2ba50685742d7b84d4d9',
        weeklyAmount: 500,
    },
    {
        tokenAddr: '0xe3d9c0ca18e6757e975b6f663811f207ec26c2b3',
        weeklyAmount: 500,
    },
];

async function main () {
    const factory = (await contractAt('PoolFactorySingle', factoryAddr)) as PoolFactorySingle;

    const _rewardToken = '0x521EE0CeDbed2a5A130B9218551fe492C5c402e4';
    const _rewardSource = '0xbbbbbbf2e986C085bF79d44BaCFA791C92b71fe8';

    for (const p of pools) {
        await factory.deployPool(owner, _rewardToken, p.tokenAddr, _rewardSource, calcRate(p.weeklyAmount));
        const poolAddr = await factory.pools((await factory.numberOfPools()).sub(1));
        console.log(`Deployed pool for token ${p.tokenAddr} at address: ${poolAddr}`);
    }
}

function calcRate (amount:number) {
    return BigNumber.from(amount).mul(tenPow18).div(7 * 24 * 60 * 60);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
