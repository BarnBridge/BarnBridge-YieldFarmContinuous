import { ethers } from 'hardhat';
import { BigNumber, Signer } from 'ethers';
import * as helpers from '../helpers/helpers';
import { getLatestBlockTimestamp, moveAtTimestamp, tenPow18 } from '../helpers/helpers';
import { expect } from 'chai';
import { Erc20Mock, PoolSingle } from '../../typechain';
import * as deploy from '../helpers/deploy';
import * as time from '../helpers/time';

describe('Rewards standalone pool single token different decimals', function () {
    const rewardsAmount18Dec = BigNumber.from(100).mul(BigNumber.from(10).pow(18));
    const amount6Dec = BigNumber.from(100).mul(BigNumber.from(10).pow(6));

    let bond: Erc20Mock, rewards: PoolSingle;
    let syPool1: Erc20Mock;

    let user: Signer, userAddress: string;
    let communityVault: Signer, dao: Signer;

    let snapshotId: any;
    let snapshotTs: number;

    before(async function () {
        bond = (await deploy.deployContract('ERC20Mock', [18])) as Erc20Mock;
        syPool1 = (await deploy.deployContract('ERC20Mock', [6])) as Erc20Mock;

        await setupSigners();
        await setupContracts();

        rewards = (await deploy.deployContract(
            'PoolSingle',
            [await dao.getAddress(), bond.address, syPool1.address])
        ) as PoolSingle;
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
            expect(rewards.address).to.not.eql(0).and.to.not.be.empty;
        });
    });

    describe('deposit', function () {
        it('sets the balance correctly', async function () {
            await syPool1.mint(userAddress, amount6Dec);
            await syPool1.connect(user).approve(rewards.address, amount6Dec);

            await expect(rewards.connect(user).deposit(amount6Dec)).to.not.be.reverted;

            const balance = await rewards.balances(userAddress);
            expect(balance).to.equal(amount6Dec).and.not.equal(rewardsAmount18Dec);
        });

        it('calculates the owed amount correctly', async function () {
            await syPool1.mint(userAddress, amount6Dec.mul(2));
            await syPool1.connect(user).approve(rewards.address, amount6Dec.mul(2));
            const { start } = await setupRewards();

            await rewards.connect(user).deposit(amount6Dec);

            await moveAtTimestamp(start + time.day);
            await rewards.connect(user).deposit(amount6Dec);

            const ts = await getLatestBlockTimestamp();

            const expectedBalance = calcTotalReward(start, ts);
            const actualBalance = await rewards.owed(userAddress);

            expect(actualBalance).to.equal(expectedBalance);
            expect(actualBalance.div(tenPow18).gt(1)).to.be.true;
        });
    });




    async function setupRewards (): Promise<{ start: number, end: number }> {
        const rate = rewardsAmount18Dec.div(7 * 24 * 60 * 60);

        await rewards.connect(dao).setRewardsSource(await communityVault.getAddress());
        await rewards.connect(dao).setRewardRatePerSecond(rate);

        const start = await getLatestBlockTimestamp();
        const end = start + 7 * 24 * 60 * 60;

        await bond.connect(communityVault).approve(rewards.address, rewardsAmount18Dec);

        return { start, end };
    }

    function calcTotalReward (startTs: number, endTs: number, rewardRatePerSecond: BigNumber = rewardsAmount18Dec.div(7 * 24 * 60 * 60)): BigNumber {
        return rewardRatePerSecond.mul(endTs - startTs);
    }

    async function setupContracts () {
        const cvValue = BigNumber.from(2800000).mul(helpers.tenPow18);
        const treasuryValue = BigNumber.from(4500000).mul(helpers.tenPow18);

        await bond.mint(await communityVault.getAddress(), cvValue);
        await bond.mint(await dao.getAddress(), treasuryValue);
    }

    async function setupSigners () {
        const accounts = await ethers.getSigners();
        user = accounts[0];
        communityVault = accounts[1];
        dao = accounts[2];

        userAddress = await user.getAddress();
    }
});
