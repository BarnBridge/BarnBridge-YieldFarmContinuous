// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.7.6;

import "../YieldFarmContinuous.sol";

contract MultiCall {
    function call_pullRewardFromSource(address rewards) public {
        YieldFarmContinuous r = YieldFarmContinuous(rewards);

        r.pullRewardFromSource();
        r.pullRewardFromSource();
        r.pullRewardFromSource();
    }
}
