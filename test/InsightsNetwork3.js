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

var InsightsNetwork1 = artifacts.require("InsightsNetwork1");
var InsightsNetwork2 = artifacts.require("InsightsNetwork2");
var InsightsNetwork3 = artifacts.require("InsightsNetwork3");


const DAY = 24*60*60;
const YEAR = 365*DAY;

function now() {
    return web3.eth.getBlock(web3.eth.blockNumber).timestamp;
}

function sleep(duration) {
    const id = Date.now();
    return new Promise((resolve, reject) => {
        web3.currentProvider.sendAsync({jsonrpc: '2.0', method: 'evm_increaseTime', params: [duration], id: id, }, error => {
            if (error)
                return reject(error);
            web3.currentProvider.sendAsync({jsonrpc: '2.0', method: 'evm_mine', id: id + 1}, (error, result) => {
                return error ? reject(error) : resolve(result);
            });
        });
    });
}

function assertAlmostEqual(x, y, message) {
    assert(y <= x && x <= y + 1, message);
}

async function assertReverted(promise, message) {
    try {
        await promise;
    } catch (error) {
        assert(error.message.startsWith("VM Exception"), error.message);
        return;
    }
    assert.fail(0, 0, message);
}


contract('InsightsNetwork3', function(accounts) {

    var in2;
    var in3;
    var in2UnlockTime;

    before(async function() {
        var in1 = await InsightsNetwork1.new();
        in2 = await InsightsNetwork2.new();
        await in1.makeSuccessor(in2.address);
        await in1.deactivate();
        await in2.activate(in1.address);
        in2UnlockTime = now() + YEAR;
        await in2.mint(accounts[4], 1);
        await in2.mintUnlockTime(accounts[4], 4, in2UnlockTime);
        await in2.mintUnlockTime(accounts[4], 5, in2UnlockTime);
        await in2.mintUnlockTime(accounts[5], 2, in2UnlockTime);
        await in2.mintUnlockTime(accounts[6], 3, in2UnlockTime);
        in3 = await InsightsNetwork3.new();
    });

    it("InsightsNetwork3", async function() {
        assert(await in3.paused(), "InsightsNetwork3 is unpaused");
        assert(await in3.mintingFinished(), "InsightsNetwork3 is minting");
    });

    it("activate", async function() {
        await assertReverted(in3.activate(0), "Invalid predecessor");
        await assertReverted(in3.activate(in2.address), "Active predecessor");
        await in2.finishMinting();
        await assertReverted(in3.activate(in2.address), "Active predecessor");
        await in2.pause();
        await in3.activate(in2.address);
        assert(!await in3.paused(), "InsightsNetwork3 is paused");
        assert(!await in3.mintingFinished(), "InsightsNetwork3 is not minting");
        await assertReverted(in3.activate(in2.address), "Repeated activation");
    });

    it("mint", async function() {
        assert.equal(await in3.balanceOf(accounts[1]), 0, "Balance should be 0");
        assert.equal(await in3.lockedBalanceOf(accounts[1]), 0, "Locked balance should be 0");
        assert(in3.mint(accounts[1], 1), "mint() failed");
        assert.equal(await in3.balanceOf(accounts[1]), 1, "Balance should be 1");
        assert.equal(await in3.lockedBalanceOf(accounts[1]), 0, "Locked balance should be 0");
    });

    it("mintBatch", async function() {
        assert.equal(await in3.balanceOf(accounts[2]), 0, "Balance 0 should be 0");
        assert.equal(await in3.lockedBalanceOf(accounts[2]), 0, "Locked balance 0 should be 0");
        assert.equal(await in3.balanceOf(accounts[3]), 0, "Balance 1 should be 0");
        assert.equal(await in3.lockedBalanceOf(accounts[3]), 0, "Locked balance 1 should be 0");
        await assertReverted(in3.mintBatch([accounts[2], accounts[3]], [2]), "Invalid mintBatch() succeeded");
        await assertReverted(in3.mintBatch(new Array(1025), new Array(1025)), "Minted too many accounts");
        assert(await in3.mintBatch([accounts[2], accounts[3]], [2, 3]), "mintBatch() failed");
        assert.equal(await in3.balanceOf(accounts[2]), 2, "Balance 0 should be 2");
        assert.equal(await in3.lockedBalanceOf(accounts[2]), 0, "Locked balance 0 should be 0");
        assert.equal(await in3.balanceOf(accounts[3]), 3, "Balance 1 should be 3");
        assert.equal(await in3.lockedBalanceOf(accounts[3]), 0, "Locked balance 1 should be 0");
    });

    it("mintUnlockTime", async function() {
        await assertReverted(in3.mintUnlockTime(accounts[4], 1, 0), "Invalid unlock time");
        assert.equal(await in3.balanceOf(accounts[4]), 0, "Balance should be 0");
        assert.equal(await in3.lockedBalanceOf(accounts[4]), 0, "Locked balance should be 0");
        var unlockTime = now() + YEAR;
        assert(await in3.mintUnlockTime(accounts[4], 1, unlockTime), "mintUnlockTime() failed");
        assert.equal(await in3.balanceOf(accounts[4]), 1, "Balance should be 1");
        assert.equal(await in3.lockedBalances(accounts[4], 0), 1, "Locked balance should be 1");
        assertAlmostEqual(await in3.unlockTimes(accounts[4], 0), unlockTime, "Unlock time should be 1 year");
        assert.equal(await in3.lockedBalanceOf(accounts[4]), 1, "Locked balance should be 1");
    });

    it("mintUnlockTimeBatch", async function() {
        assert.equal(await in3.balanceOf(accounts[5]), 0, "Balance 0 should be 0");
        assert.equal(await in3.lockedBalanceOf(accounts[5]), 0, "Locked balance 0 should be 0");
        assert.equal(await in3.balanceOf(accounts[6]), 0, "Balance 1 should be 0");
        assert.equal(await in3.lockedBalanceOf(accounts[6]), 0, "Locked balance 1 should be 0");
        var unlockTime = now() + YEAR;
        await assertReverted(in3.mintUnlockTimeBatch([accounts[5], accounts[6]], [2], unlockTime), "Invalid mintUnlockTimeBatch() succeeded");
        await assertReverted(in3.mintUnlockTimeBatch(new Array(1025), new Array(1025), unlockTime), "Minted too many accounts");
        assert(await in3.mintUnlockTimeBatch([accounts[5], accounts[6]], [2, 3], unlockTime), "mintUnlockTimeBatch() failed");
        assert.equal(await in3.balanceOf(accounts[5]), 2, "Balance 0 should be 2");
        assert.equal(await in3.lockedBalanceOf(accounts[5]), 2, "Locked balance 0 should be 2");
        assert.equal(await in3.balanceOf(accounts[6]), 3, "Balance 1 should be 3");
        assert.equal(await in3.lockedBalanceOf(accounts[6]), 3, "Locked balance 1 should be 3");
    });

    it("mintLockPeriod", async function() {
        assert.equal(await in3.balanceOf(accounts[7]), 0, "Balance should be 0");
        assert.equal(await in3.lockedBalanceOf(accounts[7]), 0, "Locked balance should be 0");
        var unlockTime = now() + 1;
        assert(await in3.mintLockPeriod(accounts[7], 1, 1), "mintLockPeriod() failed");
        assert.equal(await in3.balanceOf(accounts[7]), 1, "Balance should be 1");
        assert.equal(await in3.lockedBalances(accounts[7], 0), 1, "Locked balance should be 1");
        assertAlmostEqual(await in3.unlockTimes(accounts[7], 0), unlockTime, "Unlock time should be 1 second");
        await sleep(2);
        assert.equal(await in3.lockedBalanceOf(accounts[7]), 0, "Locked balance should be 0");
    });

    it("mintLockPeriodBatch", async function() {
        assert.equal(await in3.balanceOf(accounts[8]), 0, "Balance 0 should be 0");
        assert.equal(await in3.lockedBalanceOf(accounts[8]), 0, "Locked balance 0 should be 0");
        assert.equal(await in3.balanceOf(accounts[9]), 0, "Balance 1 should be 0");
        assert.equal(await in3.lockedBalanceOf(accounts[9]), 0, "Locked balance 1 should be 0");
        var unlockTime = now() + DAY;
        await assertReverted(in3.mintLockPeriodBatch([accounts[8], accounts[9]], [2], DAY), "Invalid mintLockPeriodBatch() succeeded");
        await assertReverted(in3.mintLockPeriodBatch(new Array(1025), new Array(1025), DAY), "Minted too many accounts");
        assert(await in3.mintLockPeriodBatch([accounts[8], accounts[9]], [2, 3], DAY), "mintLockPeriodBatch() failed");
        assert.equal(await in3.balanceOf(accounts[8]), 2, "Balance 0 should be 2");
        assert.equal(await in3.lockedBalanceOf(accounts[8]), 2, "Locked balance 0 should be 2");
        assert.equal(await in3.balanceOf(accounts[9]), 3, "Balance 1 should be 3");
        assert.equal(await in3.lockedBalanceOf(accounts[9]), 3, "Locked balance 1 should be 3");
    });

    it("importBalance", async function() {
        assert(!await in3.imported(accounts[4]), "Account balance imported");
        var balance = await in3.balanceOf(accounts[4]);
        var lockedBalance = await in3.lockedBalanceOf(accounts[4]);
        await assertReverted(in3.importBalance(accounts[1]), "Imported zero balance");
        assert(await in3.importBalance(accounts[4]), "importBalance() failed");
        assert((await in3.balanceOf(accounts[4])).minus(balance).equals(10), "Balance should have increased by 10");
        assert.equal(await in3.lockedBalances(accounts[4], 1), 4, "Locked balance 1 should be 4");
        assert.equal(await in3.lockedBalances(accounts[4], 2), 5, "Locked balance 2 should be 5");
        assert.equal(await in3.unlockTimes(accounts[4], 1), in2UnlockTime, "Lock period 1 should be 1 year");
        assert.equal(await in3.unlockTimes(accounts[4], 2), in2UnlockTime, "Lock period 2 should be 1 year");
        assert((await in3.lockedBalanceOf(accounts[4])).minus(lockedBalance).equals(9), "Locked balance should have increased by 9");
        assert(await in3.imported(accounts[4]), "Account balance not imported");
        await assertReverted(in3.importBalance(accounts[4]), "Repeated import");
    });

    it("importBalanceBatch", async function() {
        assert(!await in3.imported(accounts[5]), "Account balance 0 imported");
        assert(!await in3.imported(accounts[6]), "Account balance 1 imported");
        var balance0 = await in3.balanceOf(accounts[5]);
        var balance1 = await in3.balanceOf(accounts[6]);
        var lockedBalance0 = await in3.lockedBalanceOf(accounts[5]);
        var lockedBalance1 = await in3.lockedBalanceOf(accounts[6]);
        await assertReverted(in3.importBalanceBatch(new Array(1025)), "Imported too many accounts");
        await assertReverted(in3.importBalanceBatch([accounts[1]]), "Imported zero balance");
        assert(await in3.importBalanceBatch([accounts[5], accounts[6]]), "importBalanceBatch() failed");
        assert((await in3.balanceOf(accounts[5])).minus(balance0).equals(2), "Balance 0 should have increased by 2");
        assert((await in3.balanceOf(accounts[6])).minus(balance1).equals(3), "Balance 1 should have increased by 3");
        assert((await in3.lockedBalanceOf(accounts[5])).minus(lockedBalance0).equals(2), "Locked balance 0 should have increased by 2");
        assert((await in3.lockedBalanceOf(accounts[6])).minus(lockedBalance1).equals(3), "Locked balance 1 should have increased by 3");
        assert(await in3.imported(accounts[5]), "Account balance 0 not imported");
        assert(await in3.imported(accounts[6]), "Account balance 1 not imported");
        await assertReverted(in3.importBalanceBatch([accounts[5], accounts[6]]), "Repeated import");
    });

    it("finishMinting", async function() {
        assert(!await in3.mintingFinished(), "Minting is finished");
        assert(await in3.finishMinting(), "finishMinting() failed");
        assert(await in3.mintingFinished(), "Minting is not finished");
    });

    it("transfer", async function() {
        assert.equal(await in3.balanceOf(accounts[2]), 2, "Balance should be 2");
        assert.equal(await in3.balanceOf(accounts[7]), 1, "Balance should be 1");
        assert(!await in3.paused(), "Paused");
        await assertReverted(in3.transfer(accounts[7], 3, {from: accounts[2]}), "Transfer of non-existent balance");
        await in3.pause();
        await assertReverted(in3.transfer(accounts[7], 1, {from: accounts[2]}), "Transfer while paused");
        await in3.unpause();
        await in3.transfer(accounts[7], 1, {from: accounts[2]});
        assert.equal(await in3.balanceOf(accounts[2]), 1, "Balance should be 1");
        assert.equal(await in3.balanceOf(accounts[7]), 2, "Balance should be 2");
    });

    it("transferFrom", async function() {
        assert.equal(await in3.balanceOf(accounts[2]), 1, "Balance should be 1");
        assert.equal(await in3.balanceOf(accounts[7]), 2, "Balance should be 2");
        assert(!await in3.paused(), "Paused");
        await assertReverted(in3.transferFrom(accounts[2], accounts[7], 2), "Transfer of non-existent balance");
        await in3.pause();
        await assertReverted(in3.transferFrom(accounts[2], accounts[7], 1), "Transfer while paused");
        await in3.unpause();
        await assertReverted(in3.transferFrom(accounts[2], accounts[7], 1), "Unapproved transfer");
        await in3.approve(accounts[0], 1, {from: accounts[2]});
        await in3.transferFrom(accounts[2], accounts[7], 1);
        assert.equal(await in3.balanceOf(accounts[2]), 0, "Balance should be 0");
        assert.equal(await in3.balanceOf(accounts[7]), 3, "Balance should be 3");
    });

    it("selfDestruct", async function() {
        assert.equal(await in3.successor(), "0x0000000000000000000000000000000000000000", "Successor should not be defined");
        await assertReverted(in3.selfDestruct(accounts[8]), "Not paused");
        await in3.pause();
        await in3.selfDestruct(accounts[8]);
        assert.equal(await in3.successor(), "0x0", "Contract still exists");
    });

});
