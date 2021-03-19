import { BigNumber } from 'ethers';
import { tenPow18 } from '../test/helpers/helpers';

async function main () {
    const amount = 10000;
    const timeline = 7 * 24 * 60 * 60;

    const rate = BigNumber.from(amount).mul(tenPow18).div(timeline);

    console.log(rate.toString());
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

