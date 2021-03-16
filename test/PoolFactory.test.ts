import { ethers } from 'hardhat';
import * as helpers from './helpers/helpers';
import { contractAt, zeroAddress } from './helpers/helpers';
import { expect } from 'chai';
import { Erc20Mock, PoolFactory, SmartYieldMock, YieldFarmContinuous } from '../typechain';
import * as deploy from './helpers/deploy';
import { deployContract } from './helpers/deploy';
import { Signer } from 'ethers';

describe('PoolFactory', function () {
    let snapshotId: any;
    let snapshotTs: number;

    let dao: Signer, happyPirate: Signer;
    let factory: PoolFactory;
    let bond: Erc20Mock, syPool1: SmartYieldMock;

    before(async function () {
        await setupSigners();

        bond = (await deploy.deployContract('ERC20Mock')) as Erc20Mock;
        syPool1 = (await deploy.deployContract('SmartYieldMock', [6])) as SmartYieldMock;

        factory = (await deployContract('PoolFactory')) as PoolFactory;
        await factory.transferOwnership(await dao.getAddress());
    });

    beforeEach(async function () {
        snapshotId = await ethers.provider.send('evm_snapshot', []);
        snapshotTs = await helpers.getLatestBlockTimestamp();
    });

    afterEach(async function () {
        await ethers.provider.send('evm_revert', [snapshotId]);

        await helpers.moveAtTimestamp(snapshotTs + 5);
    });

    describe('General', function () {
        it('should be deployed', async function () {
            expect(factory.address).to.not.equal(0).and.to.not.be.empty;
        });
    });

    describe('deployPool', function () {
        it('can only be called by owner', async function () {
            await expect(factory.connect(happyPirate).deployPool(await dao.getAddress(), bond.address, syPool1.address))
                .to.be.revertedWith('only owner can call');
        });

        it('does not revert if called by owner', async function () {
            await expect(factory.connect(dao).deployPool(await dao.getAddress(), bond.address, syPool1.address))
                .to.not.be.reverted;
        });

        it('emit pool created event', async function () {
            await expect(factory.connect(dao).deployPool(await dao.getAddress(), bond.address, syPool1.address))
                .to.emit(factory, 'PoolCreated');
        });

        it('deploys contract', async function () {
            await expect(factory.connect(dao).deployPool(await dao.getAddress(), bond.address, syPool1.address))
                .to.not.be.reverted;

            expect(await factory.numberOfPools()).to.equal(1);

            const poolAddr = await factory.pools(0);
            expect(poolAddr).to.not.equal(zeroAddress);
            expect(poolAddr).to.have.length(42);

            // eslint-disable-next-line max-len
            const pool: YieldFarmContinuous = (await contractAt('YieldFarmContinuous', poolAddr)) as YieldFarmContinuous;
            expect(await pool.owner()).to.equal(await dao.getAddress());

            await expect(pool.connect(dao).setRewardsSource(await happyPirate.getAddress())).to.not.be.reverted;
            await expect(pool.connect(dao).setRewardRatePerSecond(1)).to.not.be.reverted;
        });

        it('can deploy multiple pools', async function () {
            await expect(factory.connect(dao).deployPool(await dao.getAddress(), bond.address, syPool1.address))
                .to.not.be.reverted;
            expect(await factory.numberOfPools()).to.equal(1);

            await expect(factory.connect(dao).deployPool(await dao.getAddress(), bond.address, syPool1.address))
                .to.not.be.reverted;
            expect(await factory.numberOfPools()).to.equal(2);

            await expect(factory.connect(dao).deployPool(await dao.getAddress(), bond.address, syPool1.address))
                .to.not.be.reverted;
            expect(await factory.numberOfPools()).to.equal(3);
        });
    });

    async function setupSigners () {
        const accounts = await ethers.getSigners();
        dao = accounts[2];
        happyPirate = accounts[3];
    }
});
