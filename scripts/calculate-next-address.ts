import { ethers } from 'ethers';
import { contractAt } from '../test/helpers/helpers';
import { PoolFactory } from '../typechain';

const _factory = '0xA13dDdC3CD3f6B18F9152E0CA18922538069f879';

async function main () {
    const factory = (await contractAt('PoolFactory', _factory)) as PoolFactory;
    const nonce = (await factory.numberOfPools()).toNumber() + 1;

    console.log(ethers.utils.getContractAddress({ from: _factory, nonce: nonce }));
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });

