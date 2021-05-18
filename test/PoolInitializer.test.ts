import { ethers } from 'hardhat';
import { BigNumber, Signer } from 'ethers';
import { calcRate, getLatestBlockTimestamp, moveAtTimestamp, tenPow18 } from './helpers/helpers';
import { expect } from 'chai';
import { Erc20Mock, PoolSingle, PoolMulti, PoolsInitializer } from '../typechain';
import * as time from './helpers/time';
import { deployContract } from './helpers/deploy';

describe('Pool initializer', function () {
    let snapshotId: any;
    let snapshotTs: number;

    let poolsMulti: PoolMulti[], poolsSingle: PoolSingle[];
    let poolInitializer: PoolsInitializer;
    let rewardToken1: Erc20Mock, rewardToken2: Erc20Mock;

    let owner:Signer;

    before(async function () {
        const [_owner] = await ethers.getSigners();
        owner = _owner;

        const poolToken = (await deployContract('ERC20Mock', [18])) as Erc20Mock;
        rewardToken1 = (await deployContract('ERC20Mock', [18])) as Erc20Mock;
        rewardToken2 = (await deployContract('ERC20Mock', [18])) as Erc20Mock;

        poolsMulti = [];
        for (let i = 0; i < 4; i++) {
            const pool = (await deployContract('PoolMulti', [await owner.getAddress(), poolToken.address])) as PoolMulti;
            await pool.connect(owner).approveNewRewardToken(rewardToken1.address);
            await pool.connect(owner).setRewardSource(rewardToken1.address, await owner.getAddress());
            await pool.connect(owner).setRewardRatePerSecond(rewardToken1.address, calcRate(100));
            await pool.connect(owner).approveNewRewardToken(rewardToken2.address);

            poolsMulti.push(pool);
        }

        poolsSingle = [];
        for (let i = 0; i < 3; i++) {
            const pool = (await deployContract('PoolSingle', [await owner.getAddress(), rewardToken1.address, poolToken.address])) as PoolSingle;
            await pool.connect(owner).setRewardsSource(await owner.getAddress());
            await pool.connect(owner).setRewardRatePerSecond(calcRate(100));

            poolsSingle.push(pool);
        }

        poolInitializer = (await deployContract('PoolsInitializer', [poolsMulti.map(v => v.address), poolsSingle.map(v => v.address)])) as PoolsInitializer;
    });

    beforeEach(async function () {
        snapshotId = await ethers.provider.send('evm_snapshot', []);
        snapshotTs = await getLatestBlockTimestamp();
    });

    afterEach(async function () {
        await ethers.provider.send('evm_revert', [snapshotId]);

        await moveAtTimestamp(snapshotTs + 5);
    });

    describe('General', function () {
        it('should be deployed', async function () {
            expect(poolInitializer.address).to.not.eql(0).and.to.not.be.empty;
        });
    });

    describe('pullAll', function () {
        it('works', async function () {
            const ts1 = await getLatestBlockTimestamp();
            await moveAtTimestamp(ts1 + time.day);

            for (const p of poolsMulti) {
                expect((await p.lastSoftPullTs(rewardToken1.address)).toNumber()).to.be.lessThan(ts1+1);
            }

            for (const p of poolsSingle) {
                expect((await p.lastSoftPullTs()).toNumber()).to.be.lessThan(ts1+1);
            }

            await expect(poolInitializer.pullAll()).to.not.be.reverted;
            const ts2 = await getLatestBlockTimestamp();

            expect(ts1+time.day).to.be.lessThan(ts2);

            for (const p of poolsMulti) {
                expect(await p.lastSoftPullTs(rewardToken1.address)).to.equal(ts2);
            }

            for (const p of poolsSingle) {
                expect(await p.lastSoftPullTs()).to.equal(ts2);
            }
        });
    });
});
