// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SmartYieldMock is ERC20("jToken", "MCK") {
    bool public transferFromCalled = false;

    bool public transferCalled = false;
    address public transferRecipient = address(0);
    uint256 public transferAmount = 0;

    uint256 public price = 0;

    constructor (uint8 decimals) {
        _setupDecimals(decimals);
    }

    function mint(address user, uint256 amount) public {
        _mint(user, amount);
    }

    function burnFrom(address user, uint256 amount) public {
        _burn(user, amount);
    }

    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        transferFromCalled = true;

        return super.transferFrom(sender, recipient, amount);
    }

    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        transferCalled = true;
        transferRecipient = recipient;
        transferAmount = amount;

        return super.transfer(recipient, amount);
    }

    function setPrice(uint256 value) public {
        price = value;
    }
}
