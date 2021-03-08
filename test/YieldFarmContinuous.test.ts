import { ethers } from 'hardhat';
import { BigNumber, Signer } from 'ethers';
import * as helpers from './helpers/helpers';
import { getLatestBlockTimestamp, moveAtTimestamp, tenPow18 } from './helpers/helpers';
import { expect } from 'chai';
import { Erc20Mock, MultiCall, YieldFarmContinuous, SmartYieldMock } from '../typechain';
import * as deploy from './helpers/deploy';
import { deployContract } from './helpers/deploy';
import * as time from './helpers/time';

describe('Rewards standalone pool single token', function () {
    const amount = BigNumber.from(100).mul(BigNumber.from(10).pow(18));

    let bond: Erc20Mock, rewards: YieldFarmContinuous;
    let syPool1: SmartYieldMock;

    let user: Signer, userAddress: string;
    let happyPirate: Signer, happyPirateAddress: string;
    let flyingParrot: Signer, flyingParrotAddress: string;
    let communityVault: Signer, dao: Signer;

    let defaultStartAt: number;

    let snapshotId: any;
    let snapshotTs: number;

    before(async function () {
        bond = (await deploy.deployContract('ERC20Mock')) as Erc20Mock;
        syPool1 = (await deploy.deployContract('SmartYieldMock', [18])) as SmartYieldMock;

        await setupSigners();
        await setupContracts();

        rewards = (await deploy.deployContract(
            'YieldFarmContinuous',
            [await dao.getAddress(), bond.address, syPool1.address])
        ) as YieldFarmContinuous;
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

        it('can set rewards source if called by owner', async function () {
            await expect(
                rewards.connect(happyPirate).setRewardsSource(await communityVault.getAddress())
            ).to.be.revertedWith('only owner can call');

            await expect(
                rewards.connect(dao).setRewardsSource(flyingParrotAddress)
            ).to.not.be.reverted;

            expect((await rewards.rewardSource())).to.equal(flyingParrotAddress);
        });

        it('can set rewardRatePerSecond if called by owner', async function () {
            // 1000 bond / week
            const rate = tenPow18.mul(1000).div(7 * 24 * 60 * 60);

            await expect(
                rewards.connect(happyPirate).setRewardRatePerSecond(rate)
            ).to.be.revertedWith('only owner can call');

            await expect(
                rewards.connect(dao).setRewardRatePerSecond(rate)
            ).to.be.not.be.reverted;

            expect((await rewards.rewardRatePerSecond())).to.equal(rate);
        });

        it('works if pullRewardFromSource() is called multiple times', async function () {
            const { start } = await setupRewards();
            await moveAtTimestamp(start + 7*time.day);

            const m = (await deployContract('MultiCall')) as MultiCall;
            await expect(m.call_pullRewardFromSource(rewards.address)).to.not.be.reverted;

            expect(await bond.balanceOf(rewards.address)).to.equal(amount);
            expect(await rewards.rewardNotTransferred()).to.equal(0);
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
            await syPool1.mint(userAddress, amount);
            await syPool1.connect(user).approve(rewards.address, amount);

            await expect(rewards.connect(user).deposit(amount)).to.not.be.reverted;

            const balance = await rewards.balances(userAddress);
            expect(balance).to.equal(amount);

            expect(await syPool1.balanceOf(userAddress)).to.equal(0);
            expect(await syPool1.balanceOf(rewards.address)).to.equal(amount);
        });

        it('updates pool effective size', async function () {
            await syPool1.mint(userAddress, amount);
            await syPool1.connect(user).approve(rewards.address, amount);
            await rewards.connect(user).deposit(amount);

            expect(await rewards.poolSize()).to.equal(amount);
        });

        it('emits Deposit event', async function () {
            await syPool1.mint(userAddress, amount);
            await syPool1.connect(user).approve(rewards.address, amount);

            await expect(rewards.connect(user).deposit(amount))
                .to.emit(rewards, 'Deposit')
                .withArgs(userAddress, amount, amount);
        });

        it('updates the reward owed to user and multiplier', async function () {
            await syPool1.mint(userAddress, amount.mul(2));
            await syPool1.connect(user).approve(rewards.address, amount.mul(2));
            await rewards.connect(user).deposit(amount);

            // add some reward to be distributed
            await bond.mint(rewards.address, amount);

            await rewards.connect(user).deposit(amount);

            expect(await rewards.owed(userAddress)).to.equal(amount);

            const currentMultiplier = await rewards.currentMultiplier();
            expect(currentMultiplier).to.not.equal(0);

            expect(await rewards.userMultiplier(userAddress)).to.equal(await rewards.currentMultiplier());
        });

        it('does not pull bond if function is disabled', async function () {
            await syPool1.mint(userAddress, amount.mul(3));
            await syPool1.connect(user).approve(rewards.address, amount.mul(3));
            await rewards.connect(user).deposit(amount);

            expect(await bond.balanceOf(rewards.address)).to.equal(0);

            const { start } = await setupRewards();

            await rewards.connect(user).deposit(amount);

            await helpers.moveAtTimestamp(start + time.day);

            await rewards.connect(user).deposit(amount);
            await rewards.pullRewardFromSource();

            // total time is 7 days & total amount is 100  => 1 day worth of rewards ~14.28
            let balance = await bond.balanceOf(rewards.address);
            expect(balance.gt(BigNumber.from(14).mul(helpers.tenPow18))).to.be.true;
            expect(balance.lt(BigNumber.from(15).mul(helpers.tenPow18))).to.be.true;

            // disable the pull functionality
            await rewards.connect(dao).setRewardRatePerSecond(0);
            await rewards.pullRewardFromSource();
            balance = await bond.balanceOf(rewards.address);

            // move one day in the future and the balance should not change
            await moveAtTimestamp(start + 2 * time.day);

            await rewards.softPullReward();
            await rewards.pullRewardFromSource();

            expect(await bond.balanceOf(rewards.address)).to.equal(balance);
        });

        it('does not pull bond if already pulled everything', async function () {
            await syPool1.mint(userAddress, amount.mul(3));
            await syPool1.connect(user).approve(rewards.address, amount.mul(3));

            const { end } = await setupRewards();

            await helpers.moveAtTimestamp(end + 1 * time.day);

            await rewards.connect(user).deposit(amount);
            await rewards.pullRewardFromSource();

            expect(await bond.balanceOf(rewards.address)).to.equal(amount);

            await helpers.moveAtTimestamp(end + 2 * time.day);

            await rewards.connect(user).deposit(amount);
            await rewards.pullRewardFromSource();

            expect(await bond.balanceOf(rewards.address)).to.equal(amount);
        });

        it('updates the amount owed to user but does not send funds', async function () {
            await syPool1.mint(happyPirateAddress, amount.mul(3));
            await syPool1.connect(happyPirate).approve(rewards.address, amount.mul(3));

            await bond.connect(communityVault).approve(rewards.address, amount);

            await rewards.connect(happyPirate).deposit(amount);

            await helpers.moveAtTimestamp(defaultStartAt + time.day);

            expect(await bond.balanceOf(happyPirateAddress)).to.equal(0);

            const balance = await bond.balanceOf(rewards.address);
            expect(balance.gte(0)).to.be.true;
            expect(await rewards.owed(happyPirateAddress)).to.equal(balance);
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
            await setupUserForWithdraw(syPool1, user, amount, tenPow18);

            await expect(rewards.connect(user).withdraw(amount.mul(2)))
                .to.be.revertedWith('insufficient balance');
        });

        it('updates user balance', async function () {
            await setupUserForWithdraw(syPool1, user, amount, tenPow18);

            await expect(rewards.connect(user).withdraw(amount))
                .to.not.be.reverted;

            const balance = await rewards.balances(userAddress);
            expect(balance).to.equal(0);

            expect(await syPool1.balanceOf(userAddress)).to.equal(amount);
            expect(await syPool1.balanceOf(rewards.address)).to.equal(0);
        });

        it('updates the pool size', async function () {
            await setupUserForWithdraw(syPool1, user, amount, tenPow18);

            await expect(rewards.connect(user).withdraw(amount))
                .to.not.be.reverted;

            expect(await rewards.poolSize()).to.equal(0);
        });

        it('emits Withdraw event', async function () {
            await setupUserForWithdraw(syPool1, user, amount, tenPow18);

            await expect(rewards.connect(user).withdraw(amount))
                .to.emit(rewards, 'Withdraw')
                .withArgs(userAddress, amount, 0);
        });
    });

    describe('ackFunds', function () {
        it('calculates the new multiplier when funds are added', async function () {
            await syPool1.mint(happyPirateAddress, amount.mul(2));
            await syPool1.connect(happyPirate).approve(rewards.address, amount.mul(2));

            expect(await rewards.currentMultiplier()).to.equal(0);

            await bond.mint(rewards.address, amount);
            await rewards.connect(happyPirate).deposit(amount);

            await expect(rewards.ackFunds()).to.not.be.reverted;

            expect(await rewards.currentMultiplier()).to.equal(helpers.tenPow18);
            expect(await rewards.balanceBefore()).to.equal(amount);

            await bond.mint(rewards.address, amount);

            await expect(rewards.ackFunds()).to.not.be.reverted;
            expect(await rewards.currentMultiplier()).to.equal(helpers.tenPow18.mul(2));
            expect(await rewards.balanceBefore()).to.equal(amount.mul(2));
        });

        it('does not change multiplier on funds balance decrease but changes balance', async function () {
            await syPool1.mint(happyPirateAddress, amount.mul(2));
            await syPool1.connect(happyPirate).approve(rewards.address, amount.mul(2));

            await bond.mint(rewards.address, amount);
            await rewards.connect(happyPirate).deposit(amount);

            await expect(rewards.ackFunds()).to.not.be.reverted;
            expect(await rewards.currentMultiplier()).to.equal(helpers.tenPow18);
            expect(await rewards.balanceBefore()).to.equal(amount);

            await bond.burnFrom(rewards.address, amount.div(2));

            await expect(rewards.ackFunds()).to.not.be.reverted;
            expect(await rewards.currentMultiplier()).to.equal(helpers.tenPow18);
            expect(await rewards.balanceBefore()).to.equal(amount.div(2));

            await bond.mint(rewards.address, amount.div(2));
            await rewards.ackFunds();

            // 1 + 50 / 100 = 1.5
            expect(await rewards.currentMultiplier()).to.equal(helpers.tenPow18.add(helpers.tenPow18.div(2)));
        });
    });

    describe('claim', function () {
        it('reverts if user has nothing to claim', async function () {
            await expect(rewards.connect(happyPirate).claim()).to.be.revertedWith('nothing to claim');
        });

        it('transfers the amount to user', async function () {
            await syPool1.mint(happyPirateAddress, amount.mul(2));
            await syPool1.connect(happyPirate).approve(rewards.address, amount.mul(2));
            const { start } = await setupRewards();

            await rewards.connect(happyPirate).deposit(amount);

            await helpers.moveAtTimestamp(start + time.day);

            await expect(rewards.connect(happyPirate).claim()).to.not.be.reverted;
            const claimTs = await helpers.getLatestBlockTimestamp();

            const expectedBalance = calcTotalReward(start, claimTs);

            const actualUserBalance = await bond.balanceOf(happyPirateAddress);
            const actualRewardsBalance = await bond.balanceOf(rewards.address);

            // it should transfer all the balance but there might be some dust left
            expect(actualRewardsBalance.lt(100));

            expect(await bond.transferCalled()).to.be.true;

            // at 100 bond / week, the daily reward is about 14.28
            expect(actualUserBalance.gte(tenPow18.mul(14)));
            expect(actualUserBalance.lt(tenPow18.mul(15)));

            expect(actualUserBalance.add(actualRewardsBalance)).to.equal(expectedBalance);
            expect(await rewards.owed(happyPirateAddress)).to.be.equal(0);
            expect(await rewards.balanceBefore()).to.be.equal(actualRewardsBalance);
        });

        it('works with multiple users', async function () {
            await syPool1.mint(happyPirateAddress, amount.mul(3));
            await syPool1.mint(flyingParrotAddress, amount.mul(3));
            await syPool1.mint(userAddress, amount.mul(3));
            await syPool1.connect(happyPirate).approve(rewards.address, amount.mul(3));
            await syPool1.connect(flyingParrot).approve(rewards.address, amount.mul(3));
            await syPool1.connect(user).approve(rewards.address, amount.mul(3));

            const { start } = await setupRewards();

            await rewards.connect(happyPirate).deposit(amount);
            await rewards.pullRewardFromSource();

            const pull1Ts = await helpers.getLatestBlockTimestamp();
            const expectedBalance1 = calcTotalReward(start, pull1Ts);

            expect(await bond.balanceOf(rewards.address)).to.equal(expectedBalance1);

            await rewards.connect(flyingParrot).deposit(amount);
            await rewards.pullRewardFromSource();
            const pull2Ts = await helpers.getLatestBlockTimestamp();
            const expectedBalance2 = calcTotalReward(pull1Ts, pull2Ts);

            expect(await bond.balanceOf(rewards.address)).to.equal(expectedBalance1.add(expectedBalance2));

            await rewards.connect(user).deposit(amount);
            await rewards.pullRewardFromSource();
            const pull3Ts = await helpers.getLatestBlockTimestamp();
            const expectedBalance3 = calcTotalReward(pull2Ts, pull3Ts);

            expect(await bond.balanceOf(rewards.address))
                .to.equal(expectedBalance1.add(expectedBalance2).add(expectedBalance3));

            await helpers.moveAtTimestamp(start + 10 * time.day);

            await rewards.connect(happyPirate).claim();
            const multiplier = await rewards.currentMultiplier();
            const expectedReward = multiplier.mul(amount).div(helpers.tenPow18);

            await rewards.pullRewardFromSource();
            expect(await bond.balanceOf(happyPirateAddress)).to.equal(expectedReward);
        });

        it('works fine after claim', async function () {
            await syPool1.mint(happyPirateAddress, amount.mul(3));
            await syPool1.mint(flyingParrotAddress, amount.mul(3));
            await syPool1.mint(userAddress, amount.mul(3));
            await syPool1.connect(happyPirate).approve(rewards.address, amount.mul(3));
            await syPool1.connect(flyingParrot).approve(rewards.address, amount.mul(3));
            await syPool1.connect(user).approve(rewards.address, amount.mul(3));

            const { start } = await setupRewards();

            await rewards.connect(happyPirate).deposit(amount);
            await rewards.pullRewardFromSource();
            const pull1Ts = await helpers.getLatestBlockTimestamp();
            const expectedBalance1 = calcTotalReward(start, pull1Ts);

            expect(await bond.balanceOf(rewards.address)).to.equal(expectedBalance1);

            await rewards.connect(flyingParrot).deposit(amount);
            const multiplierAtDeposit2 = await rewards.currentMultiplier();

            await rewards.pullRewardFromSource();
            const pull2Ts = await helpers.getLatestBlockTimestamp();
            const expectedBalance2 = calcTotalReward(pull1Ts, pull2Ts);

            expect(await bond.balanceOf(rewards.address)).to.equal(expectedBalance1.add(expectedBalance2));

            await rewards.connect(user).deposit(amount);
            await rewards.pullRewardFromSource();
            const pull3Ts = await helpers.getLatestBlockTimestamp();
            const expectedBalance3 = calcTotalReward(pull2Ts, pull3Ts);

            expect(await bond.balanceOf(rewards.address))
                .to.equal(expectedBalance1.add(expectedBalance2).add(expectedBalance3));

            await helpers.moveAtTimestamp(start + 1 * time.day);

            await rewards.connect(happyPirate).claim();
            const claim1Ts = await helpers.getLatestBlockTimestamp();
            const claim1Multiplier = await rewards.currentMultiplier();
            const expectedReward = claim1Multiplier.mul(amount).div(helpers.tenPow18);

            expect(await bond.balanceOf(happyPirateAddress)).to.equal(expectedReward);

            // after the first claim is executed, move 1 more day into the future which would increase the
            // total reward by ~14.28 (one day worth of reward)
            // happyPirate already claimed his reward for day 1 so he should only be able to claim one day worth of rewards
            // flyingParrot did not claim before so he should be able to claim 2 days worth of rewards
            // since there are 3 users, 1 day of rewards for one user is ~4.76 tokens
            await helpers.moveAtTimestamp(start + 2 * time.day);

            await rewards.connect(happyPirate).claim();
            const claim2Ts = await helpers.getLatestBlockTimestamp();

            const expectedRewardDay2 = calcTotalReward(claim1Ts, claim2Ts);
            const expectedMultiplier = claim1Multiplier.add(expectedRewardDay2.mul(helpers.tenPow18).div(amount.mul(3)));

            const claim2Multiplier = await rewards.currentMultiplier();
            expect(claim2Multiplier).to.equal(expectedMultiplier);

            const expectedReward2 = (claim2Multiplier.sub(claim1Multiplier)).mul(amount).div(helpers.tenPow18);
            expect(
                expectedReward2.gt(BigNumber.from(4).mul(helpers.tenPow18)) &&
                expectedReward2.lt(BigNumber.from(5).mul(helpers.tenPow18))
            ).to.be.true;
            expect(await bond.balanceOf(happyPirateAddress)).to.equal(expectedReward.add(expectedReward2));

            await rewards.connect(flyingParrot).claim();
            const multiplier3 = await rewards.currentMultiplier();
            const expectedReward3 = multiplier3.sub(multiplierAtDeposit2).mul(amount).div(helpers.tenPow18);
            expect(
                expectedReward3.gt(BigNumber.from(9).mul(helpers.tenPow18)) &&
                expectedReward3.lt(BigNumber.from(10).mul(helpers.tenPow18))).to.be.true;
            expect(await bond.balanceOf(flyingParrotAddress)).to.equal(expectedReward3);
        });
    });

    async function setupUserForWithdraw (syPool1: SmartYieldMock, user: Signer, amount: BigNumber, price: BigNumber) {
        await syPool1.mint(await user.getAddress(), amount);
        await syPool1.connect(user).approve(rewards.address, amount);
        await rewards.connect(user).deposit(amount);
    }

    async function setupRewards (): Promise<{ start: number, end: number }> {
        const rate = amount.div(7 * 24 * 60 * 60);

        await rewards.connect(dao).setRewardsSource(await communityVault.getAddress());
        await rewards.connect(dao).setRewardRatePerSecond(rate);

        const start = await getLatestBlockTimestamp();
        const end = start + 7 * 24 * 60 * 60;

        await bond.connect(communityVault).approve(rewards.address, amount);

        return { start, end };
    }

    function calcTotalReward (startTs: number, endTs: number, rewardRatePerSecond: BigNumber = amount.div(7 * 24 * 60 * 60)): BigNumber {
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
        happyPirate = accounts[3];
        flyingParrot = accounts[4];

        userAddress = await user.getAddress();
        happyPirateAddress = await happyPirate.getAddress();
        flyingParrotAddress = await flyingParrot.getAddress();
    }
});
