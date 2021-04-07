# BarnBridge Rewards Pool

This is an implementation of a single-token rewards pool with a continuous distribution mechanism.

# Smart Contract Architecture
![junior pool yf sc architecture](https://gblobscdn.gitbook.com/assets%2F-MIu3rMElIO-jG68zdaV%2F-MXHutr14sDo0hYi6gg3%2F-MXHwLedyIac7BAL_YJO%2Fjunior%20tokens.png?alt=media&token=607fe998-db46-47e1-8c24-397630103da2)


## Known issues

### Pool reactivation
**Severity: low**

After a pool has exhausted its allowance on the `rewardSource`, it will not attempt to pull any more tokens.

The problem with the above is that `lastSoftPullTs` is not updated anymore due to 0 allowance.

If, at a later time, the pool is given more allowance on the `rewardSource`, it will calculate the amount to pull as if it was never stopped which will trigger it to pull tokens for the whole period it was paused at the same rate.

The following actions would act as a workaround for the above issue:
1. set the allowance to a very small number like `1`
2. trigger a `softPullReward()` -- this would effectively pull only the allowance given and update the `lastSoftPullTs`
3. set the allowance to the desired value
