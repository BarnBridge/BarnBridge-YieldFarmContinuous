import { ethers } from 'hardhat';
import { BigNumber, BigNumberish, Signer } from 'ethers';
import * as helpers from '../helpers/helpers';
import { getLatestBlockTimestamp, moveAtTimestamp, tenPow18 } from '../helpers/helpers';
import { expect } from 'chai';
import { Erc20Mock, PoolMulti, MultiCallMulti } from '../../typechain';
import * as deploy from '../helpers/deploy';
import * as time from '../helpers/time';

describe('Rewards standalone pool multi token', function () {
    const amount = BigNumber.from(100).mul(BigNumber.from(10).pow(18));

    let rewardToken1: Erc20Mock, rewardToken2: Erc20Mock, poolToken: Erc20Mock;
    let rewards: PoolMulti;

    let user: Signer, userAddress: string;
    let happyPirate: Signer, happyPirateAddress: string;
    let flyingParrot: Signer, flyingParrotAddress: string;
    let communityVault: Signer, dao: Signer;

    let defaultStartAt: number;

    let snapshotId: any;
    let snapshotTs: number;

    before(async function () {
        rewardToken1 = (await deploy.deployContract('ERC20Mock', [18])) as Erc20Mock;
        rewardToken2 = (await deploy.deployContract('ERC20Mock', [18])) as Erc20Mock;
        poolToken = (await deploy.deployContract('ERC20Mock', [18])) as Erc20Mock;

        await setupSigners();
        await setupContracts();

        rewards = (await deploy.deployContract(
            'PoolMulti',
            [await dao.getAddress(), poolToken.address])
        ) as PoolMulti;
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

        it('sets correct owner', async function () {
            expect(await rewards.owner()).to.equal(await dao.getAddress());
        });

        it('can approve new reward tokens if called by owner', async function () {
            await expect(
                rewards.connect(happyPirate).approveNewRewardToken(rewardToken1.address)
            ).to.be.revertedWith('only owner can call');

            await expect(
                rewards.connect(dao).approveNewRewardToken(poolToken.address)
            ).to.be.revertedWith('reward token and pool token must be different');

            await expect(
                rewards.connect(dao).approveNewRewardToken(rewardToken1.address)
            ).to.not.be.reverted;

            await expect(
                rewards.connect(dao).approveNewRewardToken(rewardToken1.address)
            ).to.be.revertedWith('token already approved');

            const numTokens = await rewards.numRewardTokens();
            expect(numTokens).to.equal(1);

            const token0 = await rewards.rewardTokens(0);
            expect(token0).to.equal(rewardToken1.address);
        });

        it('can set reward source for token if called by owner', async function () {
            await expect(
                rewards.connect(happyPirate).setRewardSource(rewardToken1.address, await communityVault.getAddress())
            ).to.be.revertedWith('only owner can call');

            await expect(
                rewards.connect(dao).setRewardSource(rewardToken1.address, flyingParrotAddress)
            ).to.be.revertedWith('token not approved');

            await rewards.connect(dao).approveNewRewardToken(rewardToken1.address);

            await expect(
                rewards.connect(dao).setRewardSource(rewardToken1.address, flyingParrotAddress)
            ).to.not.be.reverted;

            expect((await rewards.rewardSources(rewardToken1.address))).to.equal(flyingParrotAddress);
        });

        it('can set rewardRatePerSecond for token if called by owner', async function () {
            // 1000 bond / week
            const rate = tenPow18.mul(1000).div(7 * 24 * 60 * 60);

            await expect(
                rewards.connect(happyPirate).setRewardRatePerSecond(rewardToken1.address, rate)
            ).to.be.revertedWith('only owner can call');

            await expect(
                rewards.connect(dao).setRewardRatePerSecond(rewardToken1.address, rate)
            ).to.be.revertedWith('token not approved');

            await rewards.connect(dao).approveNewRewardToken(rewardToken1.address);

            await expect(
                rewards.connect(dao).setRewardRatePerSecond(rewardToken1.address, rate)
            ).to.be.not.be.reverted;

            expect((await rewards.rewardRatesPerSecond(rewardToken1.address))).to.equal(rate);
        });

        it('works if pullRewardFromSource_allTokens() is called multiple times', async function () {
            const { start } = await setupRewards();
            await moveAtTimestamp(start + 7 * time.day);

            const m = (await deploy.deployContract('MultiCallMulti')) as MultiCallMulti;
            await expect(m.call_pullRewardFromSource(rewards.address)).to.not.be.reverted;

            expect(await rewardToken1.balanceOf(rewards.address)).to.equal(amount);
            expect(await rewards.rewardsNotTransferred(rewardToken1.address)).to.equal(0);
        });
    });

    describe('deposit', function () {
        it('reverts if amount is 0', async function () {
            await expect(rewards.connect(user).deposit(0))
                .to.be.revertedWith('amount must be greater than 0');
        });

        it('reverts if user did not approve token', async function () {
            await expect(rewards.connect(user).deposit(amount))
                .to.be.revertedWith('allowance must be greater than 0');
        });

        it('updates the user balance and transfers amount to itself', async function () {
            await poolToken.mint(userAddress, amount);
            await poolToken.connect(user).approve(rewards.address, amount);

            await expect(rewards.connect(user).deposit(amount)).to.not.be.reverted;

            const balance = await rewards.balances(userAddress);
            expect(balance).to.equal(amount);

            expect(await poolToken.balanceOf(userAddress)).to.equal(0);
            expect(await poolToken.balanceOf(rewards.address)).to.equal(amount);
        });

        it('updates pool effective size', async function () {
            await poolToken.mint(userAddress, amount);
            await poolToken.connect(user).approve(rewards.address, amount);
            await rewards.connect(user).deposit(amount);

            expect(await rewards.poolSize()).to.equal(amount);
        });

        it('emits Deposit event', async function () {
            await poolToken.mint(userAddress, amount);
            await poolToken.connect(user).approve(rewards.address, amount);

            await expect(rewards.connect(user).deposit(amount))
                .to.emit(rewards, 'Deposit')
                .withArgs(userAddress, amount, amount);
        });

        it('updates the reward owed to user and multiplier', async function () {
            await rewards.connect(dao).approveNewRewardToken(rewardToken1.address);
            await poolToken.mint(userAddress, amount.mul(2));
            await poolToken.connect(user).approve(rewards.address, amount.mul(2));
            await rewards.connect(user).deposit(amount);

            // add some reward to be distributed
            await rewardToken1.mint(rewards.address, amount);

            await rewards.connect(user).deposit(amount);

            expect(await rewards.owed(userAddress, rewardToken1.address)).to.equal(amount);

            const currentMultiplier = await rewards.currentMultipliers(rewardToken1.address);
            expect(currentMultiplier).to.not.equal(0);

            expect(await rewards.userMultipliers(userAddress, rewardToken1.address))
                .to.equal(await rewards.currentMultipliers(rewardToken1.address));
        });

        it('updates the reward owed to user and multiplier (multiple reward tokens)', async function () {
            await rewards.connect(dao).approveNewRewardToken(rewardToken1.address);
            await rewards.connect(dao).approveNewRewardToken(rewardToken2.address);

            await poolToken.mint(userAddress, amount.mul(2));
            await poolToken.connect(user).approve(rewards.address, amount.mul(2));
            await rewards.connect(user).deposit(amount);

            // add some reward to be distributed
            await rewardToken1.mint(rewards.address, amount);
            await rewardToken2.mint(rewards.address, amount);

            await rewards.connect(user).deposit(amount);

            expect(await rewards.owed(userAddress, rewardToken1.address)).to.equal(amount);
            expect(await rewards.owed(userAddress, rewardToken2.address)).to.equal(amount);

            const currentMultiplierT1 = await rewards.currentMultipliers(rewardToken1.address);
            expect(currentMultiplierT1).to.not.equal(0);

            const currentMultiplierT2 = await rewards.currentMultipliers(rewardToken2.address);
            expect(currentMultiplierT2).to.not.equal(0);

            expect(await rewards.userMultipliers(userAddress, rewardToken1.address))
                .to.equal(currentMultiplierT1);
            expect(await rewards.userMultipliers(userAddress, rewardToken2.address))
                .to.equal(currentMultiplierT2);
        });

        it('does not pull bond if function is disabled', async function () {
            await poolToken.mint(userAddress, amount.mul(3));
            await poolToken.connect(user).approve(rewards.address, amount.mul(3));
            await rewards.connect(user).deposit(amount);

            expect(await rewardToken1.balanceOf(rewards.address)).to.equal(0);

            const { start } = await setupRewards();

            await rewards.connect(user).deposit(amount);

            await helpers.moveAtTimestamp(start + time.day);

            await rewards.connect(user).deposit(amount);
            await rewards.pullRewardFromSource_allTokens();

            // total time is 7 days & total amount is 100  => 1 day worth of rewards ~14.28
            let balance = await rewardToken1.balanceOf(rewards.address);
            expect(balance.gt(BigNumber.from(14).mul(helpers.tenPow18))).to.be.true;
            expect(balance.lt(BigNumber.from(15).mul(helpers.tenPow18))).to.be.true;

            // disable the pull functionality
            await rewards.connect(dao).setRewardRatePerSecond(rewardToken1.address, 0);
            await rewards.pullRewardFromSource_allTokens();
            balance = await rewardToken1.balanceOf(rewards.address);

            // move one day in the future and the balance should not change
            await moveAtTimestamp(start + 2 * time.day);

            await rewards.pullRewardFromSource_allTokens();

            expect(await rewardToken1.balanceOf(rewards.address)).to.equal(balance);
        });

        it('does not pull bond if already pulled everything', async function () {
            await poolToken.mint(userAddress, amount.mul(3));
            await poolToken.connect(user).approve(rewards.address, amount.mul(3));

            const { end } = await setupRewards();

            await helpers.moveAtTimestamp(end + time.day);

            await rewards.connect(user).deposit(amount);
            await rewards.pullRewardFromSource_allTokens();

            expect(await rewardToken1.balanceOf(rewards.address)).to.equal(amount);

            await helpers.moveAtTimestamp(end + 2 * time.day);

            await rewards.connect(user).deposit(amount);
            await rewards.pullRewardFromSource_allTokens();

            expect(await rewardToken1.balanceOf(rewards.address)).to.equal(amount);
        });

        it('updates the amount owed to user but does not send funds', async function () {
            await poolToken.mint(happyPirateAddress, amount.mul(3));
            await poolToken.connect(happyPirate).approve(rewards.address, amount.mul(3));

            await rewardToken1.connect(communityVault).approve(rewards.address, amount);

            await rewards.connect(happyPirate).deposit(amount);

            await helpers.moveAtTimestamp(defaultStartAt + time.day);

            expect(await rewardToken1.balanceOf(happyPirateAddress)).to.equal(0);

            const balance = await rewardToken1.balanceOf(rewards.address);
            expect(balance.gte(0)).to.be.true;
            expect(await rewards.owed(rewardToken1.address, happyPirateAddress)).to.equal(balance);
        });
    });

    describe('withdraw', function () {
        it('reverts if amount is 0', async function () {
            await expect(rewards.connect(user).withdraw(0))
                .to.be.revertedWith('amount must be greater than 0');
        });

        it('reverts if user does not have balance', async function () {
            await expect(rewards.connect(user).withdraw(amount))
                .to.be.revertedWith('insufficient balance');
        });

        it('reverts if user does not have enough balance', async function () {
            await setupUserForWithdraw(poolToken, user, amount);

            await expect(rewards.connect(user).withdraw(amount.mul(2)))
                .to.be.revertedWith('insufficient balance');
        });

        it('updates user balance', async function () {
            await setupUserForWithdraw(poolToken, user, amount);

            await expect(rewards.connect(user).withdraw(amount))
                .to.not.be.reverted;

            const balance = await rewards.balances(userAddress);
            expect(balance).to.equal(0);

            expect(await poolToken.balanceOf(userAddress)).to.equal(amount);
            expect(await poolToken.balanceOf(rewards.address)).to.equal(0);
        });

        it('updates the pool size', async function () {
            await setupUserForWithdraw(poolToken, user, amount);

            await expect(rewards.connect(user).withdraw(amount))
                .to.not.be.reverted;

            expect(await rewards.poolSize()).to.equal(0);
        });

        it('emits Withdraw event', async function () {
            await setupUserForWithdraw(poolToken, user, amount);

            await expect(rewards.connect(user).withdraw(amount))
                .to.emit(rewards, 'Withdraw')
                .withArgs(userAddress, amount, 0);
        });
    });

    describe('claim', function () {
        it('does not revert if user has nothing to claim', async function () {
            await setupRewards();

            await expect(rewards.connect(happyPirate).claim_allTokens()).to.not.be.reverted;
            await expect(rewards.connect(happyPirate).claim(rewardToken1.address)).to.not.be.reverted;
            await expect(rewards.connect(happyPirate).claim(rewardToken2.address)).to.not.be.reverted;
            expect(await rewards.connect(happyPirate).callStatic.claim(rewardToken1.address)).to.equal(0);
            expect(await rewards.connect(happyPirate).callStatic.claim(rewardToken2.address)).to.equal(0);
        });

        it('transfers the amount to user', async function () {
            await poolToken.mint(happyPirateAddress, amount.mul(2));
            await poolToken.connect(happyPirate).approve(rewards.address, amount.mul(2));
            const { start } = await setupRewards();

            await rewards.connect(happyPirate).deposit(amount);

            await helpers.moveAtTimestamp(start + time.day);

            await expect(rewards.connect(happyPirate).claim(rewardToken1.address)).to.not.be.reverted;
            const claimTs = await helpers.getLatestBlockTimestamp();

            const expectedBalance = calcTotalReward(start, claimTs);

            const actualUserBalance = await rewardToken1.balanceOf(happyPirateAddress);
            const actualRewardsBalance = await rewardToken1.balanceOf(rewards.address);

            // it should transfer all the balance but there might be some dust left
            expect(actualRewardsBalance.lt(100));

            expect(await rewardToken1.transferCalled()).to.be.true;

            // at 100 bond / week, the daily reward is about 14.28
            expect(actualUserBalance.gte(tenPow18.mul(14)));
            expect(actualUserBalance.lt(tenPow18.mul(15)));

            expect(actualUserBalance.add(actualRewardsBalance)).to.equal(expectedBalance);
            expect(await rewards.owed(happyPirateAddress, rewardToken1.address)).to.be.equal(0);
            expect(await rewards.balancesBefore(rewardToken1.address)).to.be.equal(actualRewardsBalance);
        });

        it('works with multiple users', async function () {
            await poolToken.mint(happyPirateAddress, amount.mul(3));
            await poolToken.mint(flyingParrotAddress, amount.mul(3));
            await poolToken.mint(userAddress, amount.mul(3));
            await poolToken.connect(happyPirate).approve(rewards.address, amount.mul(3));
            await poolToken.connect(flyingParrot).approve(rewards.address, amount.mul(3));
            await poolToken.connect(user).approve(rewards.address, amount.mul(3));

            const { start } = await setupRewards();

            await rewards.connect(happyPirate).deposit(amount);
            await rewards.pullRewardFromSource_allTokens();

            const pull1Ts = await helpers.getLatestBlockTimestamp();
            const expectedBalance1 = calcTotalReward(start, pull1Ts);

            expect(await rewardToken1.balanceOf(rewards.address)).to.equal(expectedBalance1);

            await rewards.connect(flyingParrot).deposit(amount);
            await rewards.pullRewardFromSource_allTokens();
            const pull2Ts = await helpers.getLatestBlockTimestamp();
            const expectedBalance2 = calcTotalReward(pull1Ts, pull2Ts);

            expect(await rewardToken1.balanceOf(rewards.address)).to.equal(expectedBalance1.add(expectedBalance2));

            await rewards.connect(user).deposit(amount);
            await rewards.pullRewardFromSource_allTokens();
            const pull3Ts = await helpers.getLatestBlockTimestamp();
            const expectedBalance3 = calcTotalReward(pull2Ts, pull3Ts);

            expect(await rewardToken1.balanceOf(rewards.address))
                .to.equal(expectedBalance1.add(expectedBalance2).add(expectedBalance3));

            await helpers.moveAtTimestamp(start + 10 * time.day);

            await rewards.connect(happyPirate).claim(rewardToken1.address);
            const multiplier = await rewards.currentMultipliers(rewardToken1.address);
            const expectedReward = multiplier.mul(amount).div(helpers.tenPow18);

            await rewards.pullRewardFromSource_allTokens();
            expect(await rewardToken1.balanceOf(happyPirateAddress)).to.equal(expectedReward);
        });

        it('works fine after claim', async function () {
            await poolToken.mint(happyPirateAddress, amount.mul(3));
            await poolToken.mint(flyingParrotAddress, amount.mul(3));
            await poolToken.mint(userAddress, amount.mul(3));
            await poolToken.connect(happyPirate).approve(rewards.address, amount.mul(3));
            await poolToken.connect(flyingParrot).approve(rewards.address, amount.mul(3));
            await poolToken.connect(user).approve(rewards.address, amount.mul(3));

            const { start } = await setupRewards();

            await rewards.connect(happyPirate).deposit(amount);
            await rewards.pullRewardFromSource_allTokens();
            const pull1Ts = await helpers.getLatestBlockTimestamp();
            const expectedBalance1 = calcTotalReward(start, pull1Ts);

            expect(await rewardToken1.balanceOf(rewards.address)).to.equal(expectedBalance1);

            await rewards.connect(flyingParrot).deposit(amount);
            const multiplierAtDeposit2 = await rewards.currentMultipliers(rewardToken1.address);

            await rewards.pullRewardFromSource_allTokens();
            const pull2Ts = await helpers.getLatestBlockTimestamp();
            const expectedBalance2 = calcTotalReward(pull1Ts, pull2Ts);

            expect(await rewardToken1.balanceOf(rewards.address)).to.equal(expectedBalance1.add(expectedBalance2));

            await rewards.connect(user).deposit(amount);
            await rewards.pullRewardFromSource_allTokens();
            const pull3Ts = await helpers.getLatestBlockTimestamp();
            const expectedBalance3 = calcTotalReward(pull2Ts, pull3Ts);

            expect(await rewardToken1.balanceOf(rewards.address))
                .to.equal(expectedBalance1.add(expectedBalance2).add(expectedBalance3));

            await helpers.moveAtTimestamp(start + time.day);

            await rewards.connect(happyPirate).claim(rewardToken1.address);
            const claim1Ts = await helpers.getLatestBlockTimestamp();
            const claim1Multiplier = await rewards.currentMultipliers(rewardToken1.address);
            const expectedReward = claim1Multiplier.mul(amount).div(helpers.tenPow18);

            expect(await rewardToken1.balanceOf(happyPirateAddress)).to.equal(expectedReward);

            // after the first claim is executed, move 1 more day into the future which would increase the
            // total reward by ~14.28 (one day worth of reward)
            // happyPirate already claimed his reward for day 1 so he should only be able to claim
            // one day worth of rewards
            // flyingParrot did not claim before so he should be able to claim 2 days worth of rewards
            // since there are 3 users, 1 day of rewards for one user is ~4.76 tokens
            await helpers.moveAtTimestamp(start + 2 * time.day);

            await rewards.connect(happyPirate).claim(rewardToken1.address);
            const claim2Ts = await helpers.getLatestBlockTimestamp();

            const expectedRewardDay2 = calcTotalReward(claim1Ts, claim2Ts);
            const expectedMultiplier = claim1Multiplier.add(
                expectedRewardDay2.mul(helpers.tenPow18).div(amount.mul(3))
            );

            const claim2Multiplier = await rewards.currentMultipliers(rewardToken1.address);
            expect(claim2Multiplier).to.equal(expectedMultiplier);

            const expectedReward2 = (claim2Multiplier.sub(claim1Multiplier)).mul(amount).div(helpers.tenPow18);
            expect(
                expectedReward2.gt(BigNumber.from(4).mul(helpers.tenPow18)) &&
                expectedReward2.lt(BigNumber.from(5).mul(helpers.tenPow18))
            ).to.be.true;
            expect(await rewardToken1.balanceOf(happyPirateAddress)).to.equal(expectedReward.add(expectedReward2));

            await rewards.connect(flyingParrot).claim(rewardToken1.address);
            const multiplier3 = await rewards.currentMultipliers(rewardToken1.address);
            const expectedReward3 = multiplier3.sub(multiplierAtDeposit2).mul(amount).div(helpers.tenPow18);
            expect(
                expectedReward3.gt(BigNumber.from(9).mul(helpers.tenPow18)) &&
                expectedReward3.lt(BigNumber.from(10).mul(helpers.tenPow18))).to.be.true;
            expect(await rewardToken1.balanceOf(flyingParrotAddress)).to.equal(expectedReward3);
        });

        it('first user gets all reward', async function () {
            await poolToken.mint(happyPirateAddress, amount.mul(2));
            await poolToken.connect(happyPirate).approve(rewards.address, amount.mul(2));
            const { start } = await setupRewards();

            // move one day into the future
            await moveAtTimestamp(start + time.day);

            await rewards.connect(happyPirate).deposit(amount);

            // claim immediately after the first deposit. This should reward the user with all the amount accumulated
            // in the first day which should be about 14.28
            await rewards.connect(happyPirate).claim(rewardToken1.address);

            const userBalance = await rewardToken1.balanceOf(happyPirateAddress);
            expect(userBalance.gte(tenPow18.mul(14))).to.be.true;
            expect(userBalance.lte(tenPow18.mul(15))).to.be.true;
        });

        it('first user gets all reward after all withdraw', async function () {
            await poolToken.mint(happyPirateAddress, amount.mul(2));
            await poolToken.connect(happyPirate).approve(rewards.address, amount.mul(2));
            const { start } = await setupRewards();

            // move one day into the future
            await rewards.connect(happyPirate).deposit(amount);

            await moveAtTimestamp(start + time.day);
            await rewards.connect(happyPirate).withdraw(amount);

            await moveAtTimestamp(start + 2 * time.day);
            await rewards.connect(happyPirate).claim(rewardToken1.address);

            // the user only gets the reward for the first day that they were staked into the pool
            let userBalance = await rewardToken1.balanceOf(happyPirateAddress);
            expect(userBalance.gte(tenPow18.mul(14))).to.be.true;
            expect(userBalance.lte(tenPow18.mul(15))).to.be.true;

            expect(await rewards.poolSize()).to.equal(0);

            await rewards.connect(happyPirate).deposit(amount);
            await rewards.connect(happyPirate).claim(rewardToken1.address);

            // user should also receive the reward that was not distributed because nobody was in the pool
            // so their balance should be 14.28 * 2 days = ~28.57
            userBalance = await rewardToken1.balanceOf(happyPirateAddress);
            expect(userBalance.gte(tenPow18.mul(2857).div(100))).to.be.true;
            expect(userBalance.lte(tenPow18.mul(2858).div(100))).to.be.true;
        });

        it('works after rate was set to 0 (pool is disabled)', async function () {
            await poolToken.mint(happyPirateAddress, amount.mul(2));
            await poolToken.connect(happyPirate).approve(rewards.address, amount.mul(2));
            const { start } = await setupRewards();

            await rewards.connect(happyPirate).deposit(amount);

            await moveAtTimestamp(start + time.day);
            await rewards.connect(dao).setRewardRatePerSecond(rewardToken1.address, 0);

            await moveAtTimestamp(start + 7 * time.day);
            await expect(rewards.connect(happyPirate).claim(rewardToken1.address)).to.not.be.reverted;

            const multiplier1 = await rewards.currentMultipliers(rewardToken1.address);
            const expectedReward1 = calcUserReward(0, multiplier1, amount);
            expect(await rewardToken1.balanceOf(happyPirateAddress)).to.equal(expectedReward1);

            // re-enable the pool
            await rewards.connect(dao).setRewardRatePerSecond(rewardToken1.address, amount.div(7 * 24 * 60 * 60));
            const ts = await getLatestBlockTimestamp();

            await moveAtTimestamp(ts + time.day);
            await expect(rewards.connect(happyPirate).claim(rewardToken1.address)).to.not.be.reverted;
            const multiplier2 = await rewards.currentMultipliers(rewardToken1.address);
            const expectedReward2 = calcUserReward(multiplier1, multiplier2, amount);
            expect(await rewardToken1.balanceOf(happyPirateAddress)).to.equal(expectedReward1.add(expectedReward2));

            await moveAtTimestamp(ts + 2 * time.day);
            await expect(rewards.connect(happyPirate).claim(rewardToken1.address)).to.not.be.reverted;
            const multiplier3 = await rewards.currentMultipliers(rewardToken1.address);
            const expectedReward3 = calcUserReward(multiplier2, multiplier3, amount);
            expect(await rewardToken1.balanceOf(happyPirateAddress))
                .to.equal(expectedReward1.add(expectedReward2).add(expectedReward3));
        });

        it('works with multiple tokens', async function () {
            await poolToken.mint(happyPirateAddress, amount.mul(2));
            await poolToken.connect(happyPirate).approve(rewards.address, amount.mul(2));
            await rewards.connect(happyPirate).deposit(amount);

            const { start } = await setupRewards();
            await rewardToken2.mint(rewards.address, amount);

            await moveAtTimestamp(start + time.day);

            await expect(rewards.connect(happyPirate).claim_allTokens()).to.not.be.reverted;

            const expectedBalance = calcUserReward(0, await rewards.currentMultipliers(rewardToken1.address), amount);

            expect(await rewardToken1.balanceOf(happyPirateAddress)).to.equal(expectedBalance);
            expect(await rewardToken2.balanceOf(happyPirateAddress)).to.equal(amount);
        });
    });

    describe('withdrawAndClaim', function () {
        it('works', async function () {
            await poolToken.mint(happyPirateAddress, amount);
            await poolToken.connect(happyPirate).approve(rewards.address, amount);
            const { start } = await setupRewards();

            await rewardToken2.mint(rewards.address, amount);

            await rewards.connect(happyPirate).deposit(amount);
            expect(await poolToken.balanceOf(happyPirateAddress)).to.equal(0);

            await moveAtTimestamp(start + time.day);

            await rewards.connect(happyPirate).withdrawAndClaim(amount);
            const multiplier = await rewards.currentMultipliers(rewardToken1.address);
            const expectedBalance = multiplier.mul(amount).div(helpers.tenPow18);

            expect(await poolToken.balanceOf(happyPirateAddress)).to.equal(amount);
            expect(await rewardToken1.balanceOf(happyPirateAddress)).to.equal(expectedBalance);
            expect(await rewardToken2.balanceOf(happyPirateAddress)).to.equal(amount);
        });
    });

    describe('rewardLeft', function () {
        it('works', async function () {
            await poolToken.mint(happyPirateAddress, amount);
            await poolToken.connect(happyPirate).approve(rewards.address, amount);
            const { start } = await setupRewards();

            const ratePerSecond = await rewards.rewardRatesPerSecond(rewardToken1.address);
            let rewardLeft = await rewards.callStatic.rewardLeft(rewardToken1.address);

            expect(rewardLeft.gte(amount.sub(ratePerSecond))).to.be.true;

            await moveAtTimestamp(start + time.day);

            rewardLeft = await rewards.callStatic.rewardLeft(rewardToken1.address);
            expect(rewardLeft.gte(amount.sub(calcTotalReward(start, start + time.day)))).to.be.true;
        });
    });

    describe('pullRewardFromSource', function () {
        it('handles allowance set to 0 correctly', async function () {
            const { start } = await setupRewards();

            await moveAtTimestamp(start + time.day);

            await expect(rewards.pullRewardFromSource_allTokens()).to.not.be.reverted;
            const ts = await getLatestBlockTimestamp();

            const balance = await rewardToken1.balanceOf(rewards.address);
            const expectedBalance = calcTotalReward(start, ts);

            expect(balance).to.equal(expectedBalance);

            await moveAtTimestamp(start + 2 * time.day);

            // remove the allowance
            await rewardToken1.connect(communityVault).approve(rewards.address, 0);

            // contract should not fail and its balance should not change
            await expect(rewards.pullRewardFromSource_allTokens()).to.not.be.reverted;
            expect(await rewardToken1.balanceOf(rewards.address)).to.equal(expectedBalance);
        });

        it('handles rate set to 0 correctly', async function () {
            const { start } = await setupRewards();

            await moveAtTimestamp(start + time.day);

            await expect(rewards.pullRewardFromSource_allTokens()).to.not.be.reverted;
            let ts = await getLatestBlockTimestamp();
            let expectedBalance = calcTotalReward(start, ts);

            expect(await rewardToken1.balanceOf(rewards.address)).to.equal(expectedBalance);

            await moveAtTimestamp(start + 2 * time.day);
            await expect(rewards.connect(dao).setRewardRatePerSecond(rewardToken1.address, 0)).to.not.be.reverted;
            ts = await getLatestBlockTimestamp();
            expectedBalance = calcTotalReward(start, ts);

            await expect(rewards.pullRewardFromSource_allTokens()).to.not.be.reverted;

            expect(await rewardToken1.balanceOf(rewards.address)).to.equal(expectedBalance);
        });

        it('works with multiple tokens', async function () {
            const rate = amount.div(7 * 24 * 60 * 60);

            await rewardToken1.mint(await communityVault.getAddress(), amount);
            await rewards.connect(dao).approveNewRewardToken(rewardToken1.address);
            await rewards.connect(dao).setRewardSource(rewardToken1.address, await communityVault.getAddress());
            await rewards.connect(dao).setRewardRatePerSecond(rewardToken1.address, rate);
            const start1 = await getLatestBlockTimestamp();

            await rewardToken1.connect(communityVault).approve(rewards.address, amount);

            await rewardToken2.mint(await communityVault.getAddress(), amount);
            await rewards.connect(dao).approveNewRewardToken(rewardToken2.address);
            await rewards.connect(dao).setRewardSource(rewardToken2.address, await communityVault.getAddress());
            await rewards.connect(dao).setRewardRatePerSecond(rewardToken2.address, rate.div(2));
            const start2 = await getLatestBlockTimestamp();

            await rewardToken2.connect(communityVault).approve(rewards.address, amount);

            await moveAtTimestamp(start1 + time.day);

            await expect(rewards.pullRewardFromSource_allTokens()).to.not.be.reverted;
            const ts = await getLatestBlockTimestamp();

            const balanceT1 = await rewardToken1.balanceOf(rewards.address);
            const balanceT2 = await rewardToken2.balanceOf(rewards.address);

            expect(balanceT1).to.not.equal(0);
            expect(balanceT2).to.not.equal(0);

            const expectedBalanceT1 = calcTotalReward(start1, ts);
            const expectedBalanceT2 = calcTotalReward(start2, ts, rate.div(2));

            expect(balanceT1).to.equal(expectedBalanceT1);
            expect(balanceT2).to.equal(expectedBalanceT2);
        });
    });

    function calcUserReward (multiplier: BigNumberish, poolMultiplier: BigNumber, userBalance: BigNumber): BigNumber {
        return poolMultiplier.sub(multiplier).mul(userBalance).div(tenPow18);
    }

    async function setupUserForWithdraw (syPool1: Erc20Mock, user: Signer, amount: BigNumber) {
        await syPool1.mint(await user.getAddress(), amount);
        await syPool1.connect(user).approve(rewards.address, amount);
        await rewards.connect(user).deposit(amount);
    }

    async function setupRewards (): Promise<{ start: number, end: number }> {
        const rate = amount.div(7 * 24 * 60 * 60);

        await rewards.connect(dao).approveNewRewardToken(rewardToken1.address);
        await rewards.connect(dao).approveNewRewardToken(rewardToken2.address);
        await rewards.connect(dao).setRewardSource(rewardToken1.address, await communityVault.getAddress());
        await rewards.connect(dao).setRewardRatePerSecond(rewardToken1.address, rate);

        const start = await getLatestBlockTimestamp();
        const end = start + 7 * 24 * 60 * 60;

        await rewardToken1.connect(communityVault).approve(rewards.address, amount);

        return { start, end };
    }

    function calcTotalReward (
        startTs: number,
        endTs: number,
        rewardRatePerSecond: BigNumber = amount.div(7 * 24 * 60 * 60)
    ): BigNumber {
        return rewardRatePerSecond.mul(endTs - startTs);
    }

    async function setupContracts () {
        const cvValue = BigNumber.from(2800000).mul(helpers.tenPow18);
        const treasuryValue = BigNumber.from(4500000).mul(helpers.tenPow18);

        await rewardToken1.mint(await communityVault.getAddress(), cvValue);
        await rewardToken1.mint(await dao.getAddress(), treasuryValue);
    }

    async function setupSigners () {
        const accounts = await ethers.getSigners();
        user = accounts[0];
        communityVault = accounts[1];
        dao = accounts[2];
        happyPirate = accounts[3];
        flyingParrot = accounts[4];

        userAddress = await user.getAddress();
        happyPirateAddress = await happyPirate.getAddress();
        flyingParrotAddress = await flyingParrot.getAddress();
    }
});
