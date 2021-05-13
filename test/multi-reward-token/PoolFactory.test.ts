import { ethers } from 'hardhat';
import * as helpers from '../helpers/helpers';
import { contractAt, zeroAddress } from '../helpers/helpers';
import { expect } from 'chai';
import { Erc20Mock, PoolFactoryMulti, PoolMulti } from '../../typechain';
import * as deploy from '../helpers/deploy';
import { deployContract } from '../helpers/deploy';
import { Signer } from 'ethers';

describe('PoolFactoryMulti', function () {
    let snapshotId: any;
    let snapshotTs: number;

    let dao: Signer, happyPirate: Signer, cv: Signer;
    let cvAddress: string;
    let factory: PoolFactoryMulti;
    let bond: Erc20Mock, syPool1: Erc20Mock;

    before(async function () {
        await setupSigners();

        bond = (await deploy.deployContract('ERC20Mock', [18])) as Erc20Mock;
        syPool1 = (await deploy.deployContract('ERC20Mock', [6])) as Erc20Mock;

        factory = (await deployContract('PoolFactoryMulti', [await dao.getAddress()])) as PoolFactoryMulti;
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
            await expect(factory.connect(happyPirate)
                .deployPool(await dao.getAddress(), syPool1.address, [{
                    tokenAddress: bond.address,
                    rewardSource: cvAddress,
                    rewardRate: 1,
                }]))
                .to.be.revertedWith('only owner can call');
        });

        it('does not revert if called by owner', async function () {
            await expect(factory.connect(dao)
                .deployPool(await dao.getAddress(), syPool1.address, [{
                    tokenAddress: bond.address,
                    rewardSource: cvAddress,
                    rewardRate: 1,
                }]))
                .to.not.be.reverted;
        });

        it('emit pool created event', async function () {
            await expect(factory.connect(dao)
                .deployPool(await dao.getAddress(), syPool1.address, [{
                    tokenAddress: bond.address,
                    rewardSource: cvAddress,
                    rewardRate: 1,
                }]))
                .to.emit(factory, 'PoolMultiCreated');
        });

        it('deploys contract', async function () {
            await expect(factory.connect(dao)
                .deployPool(await dao.getAddress(), syPool1.address, [{
                    tokenAddress: bond.address,
                    rewardSource: cvAddress,
                    rewardRate: 1,
                }]))
                .to.not.be.reverted;

            expect(await factory.numberOfPools()).to.equal(1);

            const poolAddr = await factory.pools(0);
            expect(poolAddr).to.not.equal(zeroAddress);
            expect(poolAddr).to.have.length(42);

            const pool: PoolMulti = (await contractAt('PoolMulti', poolAddr)) as PoolMulti;
            expect(await pool.owner()).to.equal(await dao.getAddress());
            expect(await pool.rewardRatesPerSecond(bond.address)).to.equal(1);
            expect(await pool.rewardSources(bond.address)).to.equal(cvAddress);

            await expect(pool.connect(dao).setRewardSource(bond.address, await happyPirate.getAddress()))
                .to.not.be.reverted;
            await expect(pool.connect(dao).setRewardRatePerSecond(bond.address, 2)).to.not.be.reverted;
        });

        it('can deploy multiple pools', async function () {
            await expect(factory.connect(dao)
                .deployPool(await dao.getAddress(), syPool1.address, [{
                    tokenAddress: bond.address,
                    rewardSource: cvAddress,
                    rewardRate: 1,
                }]))
                .to.not.be.reverted;
            expect(await factory.numberOfPools()).to.equal(1);

            await expect(factory.connect(dao)
                .deployPool(await dao.getAddress(), syPool1.address, [{
                    tokenAddress: bond.address,
                    rewardSource: cvAddress,
                    rewardRate: 1,
                }]))
                .to.not.be.reverted;
            expect(await factory.numberOfPools()).to.equal(2);

            await expect(factory.connect(dao)
                .deployPool(await dao.getAddress(), syPool1.address, [{
                    tokenAddress: bond.address,
                    rewardSource: cvAddress,
                    rewardRate: 1,
                }]))
                .to.not.be.reverted;
            expect(await factory.numberOfPools()).to.equal(3);
        });
    });

    async function setupSigners () {
        const accounts = await ethers.getSigners();
        dao = accounts[2];
        happyPirate = accounts[3];
        cv = accounts[4];
        cvAddress = await cv.getAddress();
    }
});
