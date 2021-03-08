import { YieldFarmContinuous } from '../typechain';
import { contractAt, tenPow18 } from '../test/helpers/helpers';

const rewardsAddr = '';

const communityVault = '0xB56ccaD94c714c3Ad1807EB3f5d651C7633BB252';
const ratePerWeek = 1000;
const ratePerWeekScaled = tenPow18.mul(ratePerWeek);

async function main () {
    const rewards = (
        await contractAt('YieldFarmContinuous', rewardsAddr)
    ) as YieldFarmContinuous;

    const ratePerSecond = ratePerWeekScaled.div(7*24*60*60);
    await rewards.setRewardsSource(communityVault);
    await rewards.setRewardRatePerSecond(ratePerSecond);

    console.log('done');
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

