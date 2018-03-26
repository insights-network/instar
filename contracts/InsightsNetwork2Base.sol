/*
Copyright 2018 Insights Network

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
*/

pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "zeppelin-solidity/contracts/token/ERC20/PausableToken.sol";
import "zeppelin-solidity/contracts/token/ERC20/CappedToken.sol";

import "./InsightsNetwork1.sol";


contract InsightsNetwork2Base is DetailedERC20("Insights Network", "INSTAR", 18), PausableToken, CappedToken{

    uint256 constant ATTOTOKEN_FACTOR = 10**18;

    address public predecessor;
    address public successor;

    uint constant MAX_LENGTH = 1024;
    uint constant MAX_PURCHASES = 64;

    mapping (address => uint256[]) public lockedBalances;
    mapping (address => uint256[]) public unlockTimes;
    mapping (address => bool) public imported;

    event Import(address indexed account, uint256 amount, uint256 unlockTime);

    function InsightsNetwork2Base() public CappedToken(300*1000000*ATTOTOKEN_FACTOR) {
        paused = true;
        mintingFinished = true;
    }

    function activate(address _predecessor) public onlyOwner {
        require(predecessor == 0);
        require(_predecessor != 0);
        require(predecessorDeactivated(_predecessor));
        predecessor = _predecessor;
        unpause();
        mintingFinished = false;
    }

    function lockedBalanceOf(address account) public view returns (uint256 balance) {
        uint256 amount;
        for (uint256 index = 0; index < lockedBalances[account].length; index++)
            if (unlockTimes[account][index] > now)
                amount += lockedBalances[account][index];
        return amount;
    }

    function mintBatch(address[] accounts, uint256[] amounts) public onlyOwner canMint returns (bool) {
        require(accounts.length == amounts.length);
        require(accounts.length <= MAX_LENGTH);
        for (uint index = 0; index < accounts.length; index++)
            require(mint(accounts[index], amounts[index]));
        return true;
    }

    function mintUnlockTime(address account, uint256 amount, uint256 unlockTime) public onlyOwner canMint returns (bool) {
        require(unlockTime > now);
        require(lockedBalances[account].length < MAX_PURCHASES);
        lockedBalances[account].push(amount);
        unlockTimes[account].push(unlockTime);
        return super.mint(account, amount);
    }

    function mintUnlockTimeBatch(address[] accounts, uint256[] amounts, uint256 unlockTime) public onlyOwner canMint returns (bool) {
        require(accounts.length == amounts.length);
        require(accounts.length <= MAX_LENGTH);
        for (uint index = 0; index < accounts.length; index++)
            require(mintUnlockTime(accounts[index], amounts[index], unlockTime));
        return true;
    }

    function mintLockPeriod(address account, uint256 amount, uint256 lockPeriod) public onlyOwner canMint returns (bool) {
        return mintUnlockTime(account, amount, now + lockPeriod);
    }

    function mintLockPeriodBatch(address[] accounts, uint256[] amounts, uint256 lockPeriod) public onlyOwner canMint returns (bool) {
        return mintUnlockTimeBatch(accounts, amounts, now + lockPeriod);
    }

    function importBalance(address account) public onlyOwner canMint returns (bool);

    function importBalanceBatch(address[] accounts) public onlyOwner canMint returns (bool) {
        require(accounts.length <= MAX_LENGTH);
        for (uint index = 0; index < accounts.length; index++)
            require(importBalance(accounts[index]));
        return true;
    }

    function transfer(address to, uint256 value) public returns (bool) {
        require(value <= balances[msg.sender] - lockedBalanceOf(msg.sender));
        return super.transfer(to, value);
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(value <= balances[from] - lockedBalanceOf(from));
        return super.transferFrom(from, to, value);
    }

    function selfDestruct(address _successor) public onlyOwner whenPaused {
        require(mintingFinished);
        successor = _successor;
        selfdestruct(owner);
    }

    function predecessorDeactivated(address _predecessor) internal view onlyOwner returns (bool);

}
