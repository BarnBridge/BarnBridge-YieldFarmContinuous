import { contractAt, tenPow18 } from '../test/helpers/helpers';
import { PoolFactorySingle, Erc20Mock } from '../typechain';
import { BigNumber } from 'ethers';

const factoryAddr = '0xEbE3F216d60C60863CAB6BF7d6cEC378a2ddE492'; // from deploy-factory.ts 
const owner = '0x1CecFD44C68a1C76c3cB6dA88f8ECb2f4dB36347'; // your Kovan wallet address specified in deploy-factory.ts 

const pools = [
    {
        tokenAddr: '0x53ffd02bda592e89fd5f2ba50685742d7b84d4d9', // Kovan bb_crUSDC Cream USDC
        weeklyAmount: 500,
    },
    {
        tokenAddr: '0xe3d9c0ca18e6757e975b6f663811f207ec26c2b3', // Kovan bb_aUSDT Aave USDT
        weeklyAmount: 500,
    },
];

async function main () {
    const factory = (await contractAt('PoolFactorySingle', factoryAddr)) as PoolFactorySingle;

    const _rewardToken = '0x521EE0CeDbed2a5A130B9218551fe492C5c402e4'; // Kovan BOND (contact Integrations Team for distribution)
    const _rewardSource = '0x1CecFD44C68a1C76c3cB6dA88f8ECb2f4dB36347'; // your Kovan wallet containing Kovan BOND

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
