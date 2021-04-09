# Test results
```shell
  PoolFactory
    General
      ✓ should be deployed
    deployPool
      ✓ can only be called by owner (45ms)
      ✓ does not revert if called by owner (81ms)
      ✓ emit pool created event (71ms)
      ✓ deploys contract (164ms)
      ✓ can deploy multiple pools (199ms)

  Rewards standalone pool single token different decimals
    General
      ✓ should be deployed
    deposit
      ✓ sets the balance correctly (84ms)
      ✓ calculates the owed amount correctly (217ms)

  Rewards standalone pool single token
    General
      ✓ should be deployed
      ✓ sets correct owner
      ✓ can set rewards source if called by owner
      ✓ can set rewardRatePerSecond if called by owner
      ✓ works if pullRewardFromSource() is called multiple times (125ms)
    deposit
      ✓ reverts if amount is 0
      ✓ reverts if user did not approve token
      ✓ updates the user balance and transfers amount to itself (82ms)
      ✓ updates pool effective size (65ms)
      ✓ emits Deposit event (59ms)
      ✓ updates the reward owed to user and multiplier (132ms)
      ✓ does not pull bond if function is disabled (296ms)
      ✓ does not pull bond if already pulled everything (177ms)
      ✓ updates the amount owed to user but does not send funds (83ms)
    withdraw
      ✓ reverts if amount is 0
      ✓ reverts if user does not have balance
      ✓ reverts if user does not have enough balance (61ms)
      ✓ updates user balance (102ms)
      ✓ updates the pool size (85ms)
      ✓ emits Withdraw event (83ms)
    ackFunds
      ✓ calculates the new multiplier when funds are added (127ms)
      ✓ does not change multiplier on funds balance decrease but changes balance (149ms)
    claim
      ✓ does not revert if user has nothing to claim (78ms)
      ✓ transfers the amount to user (175ms)
      ✓ works with multiple users (382ms)
      ✓ works fine after claim (483ms)
      ✓ first user gets all reward (155ms)
      ✓ first user gets all reward after all withdraw (268ms)
      ✓ works after rate was set to 0 (pool is disabled) (285ms)
    withdrawAndClaim
      ✓ works (173ms)
    rewardLeft
      ✓ works (84ms)
    pullRewardFromSource
      ✓ handles allowance set to 0 correctly (95ms)
      ✓ handles rate set to 0 correctly (106ms)


  42 passing (6s)

--------------------------|----------|----------|----------|----------|----------------|
File                      |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
--------------------------|----------|----------|----------|----------|----------------|
 contracts/               |      100 |     92.5 |      100 |      100 |                |
  Governed.sol            |      100 |     87.5 |      100 |      100 |                |
  PoolFactory.sol         |      100 |      100 |      100 |      100 |                |
  YieldFarmContinuous.sol |      100 |    93.33 |      100 |      100 |                |
 contracts/interfaces/    |      100 |      100 |      100 |      100 |                |
  ISmartYield.sol         |      100 |      100 |      100 |      100 |                |
--------------------------|----------|----------|----------|----------|----------------|
All files                 |      100 |     92.5 |      100 |      100 |                |
--------------------------|----------|----------|----------|----------|----------------|
```
