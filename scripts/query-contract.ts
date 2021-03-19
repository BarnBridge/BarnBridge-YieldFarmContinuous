import { contractAt } from '../test/helpers/helpers';
import { YieldFarmContinuous } from '../typechain';

const farm = '0x112082A889EC68B1dC38E09514FC1AF001DBA1D9';

async function main () {
    const factory = (await contractAt('YieldFarmContinuous', farm)) as YieldFarmContinuous;
    const data = await factory.callStatic.rewardLeft();

    console.log(data.toString());
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
