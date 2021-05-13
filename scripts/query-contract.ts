import { contractAt } from '../test/helpers/helpers';
import { PoolMulti } from '../typechain';

const farm = '0x7e7D2cbA768Bd990c5b207aBC4912CF308837Afa';

async function main () {
    const factory = (await contractAt('PoolMulti', farm)) as PoolMulti;
    const data = await factory.callStatic.rewardLeft('0x521EE0CeDbed2a5A130B9218551fe492C5c402e4');

    console.log(data.toString());
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
