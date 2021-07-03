import { calcRate, contractAt } from '../test/helpers/helpers';
import { PoolFactoryMulti } from '../typechain';
import { BigNumber } from 'ethers';

const zero = BigNumber.from(0);
const zeroAddress = '0x0000000000000000000000000000000000000000';

const factoryAddr = '0xdBe3C9D09F039693E46Ba5bd2746FAd0DCbe1C1a';
const owner = '0x558Ef269Bcc4cc9F2e14E3f4301231fbeb85d95F';

const BOND = '0xA041544fe2BE56CCe31Ebb69102B965E06aacE80';
const WMATIC = '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270';
const cv = '0xB7427Be57a8f084697ca680A55838BCea54f2899';

const pools = [
    {
        poolToken: '0xDAA037F99d168b552c0c61B7Fb64cF7819D78310', // bb_amDAI
        rewardTokens: [
            {
                tokenAddress: BOND,
                rewardSource: cv,
                rewardRate: calcRate(2_500),
            },
            {
                tokenAddress: WMATIC,
                rewardSource: zeroAddress,
                rewardRate: zero,
            },
        ],
    },
    {
        poolToken: '0x18efBF54e18efbdd55e94176C65959864efc7D8e', // bb_amUSDT
        rewardTokens: [
            {
                tokenAddress: BOND,
                rewardSource: cv,
                rewardRate: calcRate(500),
            },
            {
                tokenAddress: WMATIC,
                rewardSource: zeroAddress,
                rewardRate: zero,
            },
        ],
    },
    {
        poolToken: '0x7d0BdcDF61655d2eF3D339D2B15421f4F6A28D2f', // bb_amUSDC
        rewardTokens: [
            {
                tokenAddress: BOND,
                rewardSource: cv,
                rewardRate: calcRate(10_000),
            },
            {
                tokenAddress: WMATIC,
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
