// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "./YieldFarmContinuous.sol";

contract PoolFactory is Ownable {
    YieldFarmContinuous[] public pools;
    uint256 public numberOfPools;

    event PoolCreated(address pool);

    function deployPool(address _owner, address _rewardToken, address _poolToken) public returns (address) {
        require(msg.sender == owner(), "only owner can call");

        YieldFarmContinuous pool = new YieldFarmContinuous(_owner, _rewardToken, _poolToken);
        pools.push(pool);
        numberOfPools++;

        emit PoolCreated(address(pool));

        return address(pool);
    }

}
