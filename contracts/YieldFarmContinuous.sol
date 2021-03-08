// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "./interfaces/ISmartYield.sol";
import "./Governed.sol";

contract YieldFarmContinuous is Governed {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint256 constant multiplierScale = 10 ** 18;

    IERC20 public poolToken;
    IERC20 public rewardToken;

    uint256 public lastHardPullTs;
    uint256 public rewardNotTransferred;
    uint256 public balanceBefore;
    uint256 public currentMultiplier;

    mapping(address => uint256) public balances;
    mapping(address => uint256) public userMultiplier;
    mapping(address => uint256) public owed;

    uint256 public poolSize;

    event Claim(address indexed user, uint256 amount);
    event Deposit(address indexed user, uint256 amount, uint256 balanceAfter);
    event Withdraw(address indexed user, uint256 amount, uint256 balanceAfter);

    constructor(address _owner, address _rewardToken, address _poolToken) {
        require(_rewardToken != address(0), "reward token must not be 0x0");

        transferOwnership(_owner);

        rewardToken = IERC20(_rewardToken);
        poolToken = IERC20(_poolToken);
    }

    function deposit(uint256 amount) public {
        require(amount > 0, "amount must be greater than 0");

        require(
            poolToken.allowance(msg.sender, address(this)) >= amount,
            "allowance must be greater than 0"
        );

        _calculateOwed(msg.sender);

        balances[msg.sender] = balances[msg.sender].add(amount);
        poolSize = poolSize.add(amount);

        poolToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Deposit(msg.sender, amount, balances[msg.sender]);
    }

    function withdraw(uint256 amount) public {
        require(amount > 0, "amount must be greater than 0");
        require(balances[msg.sender] >= amount, "insufficient balance");

        // update the amount owed to the user before doing any change on his balance
        _calculateOwed(msg.sender);

        balances[msg.sender] = balances[msg.sender].sub(amount);
        poolSize = poolSize.sub(amount);

        poolToken.safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, amount, balances[msg.sender]);
    }

    // claim calculates the currently owed reward and transfers the funds to the user
    function claim() public returns (uint256){
        _calculateOwed(msg.sender);

        uint256 amount = owed[msg.sender];
        require(amount > 0, "nothing to claim");

        if (rewardToken.balanceOf(address(this)) < amount) {
            pullRewardFromSource();
        }

        owed[msg.sender] = 0;

        rewardToken.safeTransfer(msg.sender, amount);

        // acknowledge the amount that was transferred to the user
        ackFunds();

        emit Claim(msg.sender, amount);

        return amount;
    }

    // ackFunds checks the difference between the last known balance of `token` and the current one
    // if it goes up, the multiplier is re-calculated
    // if it goes down, it only updates the known balance
    function ackFunds() public {
        uint256 balanceNow = effectiveRewardBalance();

        if (balanceNow == 0 || balanceNow <= balanceBefore) {
            balanceBefore = balanceNow;
            return;
        }

        // if there's no bond staked, it doesn't make sense to ackFunds because there's nobody to distribute them to
        // and the calculation would fail anyways due to division by 0
        if (poolSize == 0) {
            return;
        }

        uint256 diff = balanceNow.sub(balanceBefore);
        uint256 multiplier = currentMultiplier.add(diff.mul(multiplierScale).div(poolSize));

        balanceBefore = balanceNow;
        currentMultiplier = multiplier;
    }

    function pullRewardFromSource() public {
        // avoid executing this function multiple times in the same block
        if (lastHardPullTs == block.timestamp) {
            return;
        }

        softPullReward();

        // if there's nothing to transfer, stop the execution
        if (rewardNotTransferred == 0) {
            return;
        }

        uint256 amountToTransfer = rewardNotTransferred;

        rewardNotTransferred = 0;
        lastHardPullTs = block.timestamp;

        rewardToken.safeTransferFrom(rewardSource, address(this), amountToTransfer);

        ackFunds();
    }

    function softPullReward() public override {
        if (rewardRatePerSecond == 0 || rewardSource == address(0)) {
            return;
        }

        // no need to execute multiple times in the same block
        if (lastSoftPullTs == block.timestamp) {
            return;
        }

        uint256 allowance = rewardToken.allowance(rewardSource, address(this));
        if (allowance == 0 || allowance <= rewardNotTransferred) {
            return;
        }

        uint256 allowanceLeft = allowance - rewardNotTransferred;

        uint256 timeSinceLastPull = block.timestamp.sub(lastSoftPullTs);
        uint256 amountToPull = timeSinceLastPull.mul(rewardRatePerSecond);

        if (amountToPull > allowanceLeft) {
            amountToPull = allowanceLeft;
        }

        rewardNotTransferred = rewardNotTransferred + amountToPull;
        lastSoftPullTs = block.timestamp;
    }

    function effectiveRewardBalance() public view returns (uint256) {
        uint256 actualBalance = rewardToken.balanceOf(address(this));

        return actualBalance + rewardNotTransferred;
    }

    function calculateRatePerSecond(uint256 startTs, uint256 endTs, uint256 amount) public pure returns (uint256) {
        uint256 totalDuration = endTs.sub(startTs);

        return amount.div(totalDuration);
    }

    // _calculateOwed calculates and updates the total amount that is owed to an user and updates the user's multiplier
    // to the current value
    // it automatically attempts to pull the token from the source and acknowledge the funds
    function _calculateOwed(address user) internal {
        softPullReward();
        ackFunds();

        uint256 reward = _userPendingReward(user);

        owed[user] = owed[user].add(reward);
        userMultiplier[user] = currentMultiplier;
    }

    // _userPendingReward calculates the reward that should be based on the current multiplier / anything that's not included in the `owed[user]` value
    // it does not represent the entire reward that's due to the user unless added on top of `owed[user]`
    function _userPendingReward(address user) internal view returns (uint256) {
        uint256 multiplier = currentMultiplier.sub(userMultiplier[user]);

        return balances[user].mul(multiplier).div(multiplierScale);
    }
}
