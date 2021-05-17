import { contractAt, tenPow18 } from '../test/helpers/helpers';
import { PoolFactorySingle } from '../typechain';
import { BigNumber } from 'ethers';

const factoryAddr = '0x27FE2BFBb6be96D64Db0e741078A1f29Aa20226B';
const owner = '0x89d652C64d7CeE18F5DF53B24d9D29D130b18798';

async function main () {
    const factory = (await contractAt('PoolFactorySingle', factoryAddr)) as PoolFactorySingle;

    const _rewardToken = '0x0391D2021f89DC339F60Fff84546EA23E337750f';
    const _rewardSource = '0xA3C299eEE1998F45c20010276684921EBE6423D9';

    const bbcrDAI = '0x89d82FdF095083Ded96B48FC6462Ed5dBD14151f';
    const bbcrDAIWeeklyAmount = 250;
    await factory.deployPool(owner, _rewardToken, bbcrDAI, _rewardSource, calcRate(bbcrDAIWeeklyAmount));

    let pool = await factory.pools((await factory.numberOfPools()).sub(1));
    console.log(`Deployed pool at address: ${pool}`);

    const bbcrUSDC = '0x62e479060c89C48199FC7ad43b1432CC585BA1b9';
    const bbcrUSDCWeeklyAmount = 500;
    await factory.deployPool(owner, _rewardToken, bbcrUSDC, _rewardSource, calcRate(bbcrUSDCWeeklyAmount));

    pool = await factory.pools((await factory.numberOfPools()).sub(1));
    console.log(`Deployed pool at address: ${pool}`);

    const bbcrUSDT = '0xc45F49bE156888a1C0C93dc0fE7dC89091E291f5';
    const bbcrUSDTWeeklyAmount = 250;
    await factory.deployPool(owner, _rewardToken, bbcrUSDT, _rewardSource, calcRate(bbcrUSDTWeeklyAmount));

    pool = await factory.pools((await factory.numberOfPools()).sub(1));
    console.log(`Deployed pool at address: ${pool}`);
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
