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

import "./InsightsNetwork2Base.sol";


contract InsightsNetwork3 is InsightsNetwork2Base {

    function importBalance(address account) public onlyOwner canMint returns (bool) {
        require(!imported[account]);
        InsightsNetwork2Base source = InsightsNetwork2Base(predecessor);
        uint256 amount = source.balanceOf(account);
        require(amount > 0);
        imported[account] = true;
        uint256 mintAmount = amount - source.lockedBalanceOf(account);
        if (mintAmount > 0) {
            Import(account, mintAmount, now);
            assert(mint(account, mintAmount));
            amount -= mintAmount;
        }
        for (uint index = 0; amount > 0; index++) {
            uint256 unlockTime = source.unlockTimes(account, index);
            if ( unlockTime > now ) {
                mintAmount = source.lockedBalances(account, index);
                Import(account, mintAmount, unlockTime);
                assert(mintUnlockTime(account, mintAmount, unlockTime));
                amount -= mintAmount;
            }
        }
        return true;
    }

    function predecessorDeactivated(address _predecessor) internal view onlyOwner returns (bool) {
        return InsightsNetwork2Base(_predecessor).paused() && InsightsNetwork2Base(_predecessor).mintingFinished();
    }

}
