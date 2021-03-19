import { ethers } from 'ethers';
import { contractAt } from '../test/helpers/helpers';
import { PoolFactory } from '../typechain';

const _factory = '0x2e93403C675Ccb9C564edf2dC6001233d0650582';

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

