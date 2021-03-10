import * as deploy from '../test/helpers/deploy';
import { YieldFarmContinuous } from '../typechain';

const owner = '0xbbbbbbf2e986C085bF79d44BaCFA791C92b71fe8';
const rewardToken = '0x521EE0CeDbed2a5A130B9218551fe492C5c402e4';
const poolToken = '0xD165c8CAE4D824E75588282821C57fB3b74c7f33';

async function main () {
    const rewards = (
        await deploy.deployContract('YieldFarmContinuous', [owner, rewardToken, poolToken])
    ) as YieldFarmContinuous;

    console.log(`Pool deployed at: ${rewards.address}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

