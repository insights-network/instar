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


contract('InsightsNetwork2', function(accounts) {

    var in1;
    var in2;
    var in1UnlockTime;

    before(async function() {
        in1 = await InsightsNetwork1.new();
        in1UnlockTime = now() + YEAR;
        await in1.register(accounts[4], 1);
        await in1.register(accounts[5], 2);
        await in1.register(accounts[6], 3);
        in2 = await InsightsNetwork2.new();
        await in1.makeSuccessor(in2.address);
    });

    it("InsightsNetwork2", async function() {
        assert(await in2.paused(), "InsightsNetwork2 is unpaused");
        assert(await in2.mintingFinished(), "InsightsNetwork2 is minting");
    });

    it("activate", async function() {
        await assertReverted(in2.activate(0), "Invalid predecessor");
        await assertReverted(in2.activate(in1.address), "Active predecessor");
        await in1.deactivate();
        await in2.activate(in1.address);
        assert(!await in2.paused(), "InsightsNetwork2 is paused");
        assert(!await in2.mintingFinished(), "InsightsNetwork2 is not minting");
        await assertReverted(in2.activate(in1.address), "Repeated activation");
    });

    it("mint", async function() {
        assert.equal(await in2.balanceOf(accounts[1]), 0, "Balance should be 0");
        assert.equal(await in2.lockedBalanceOf(accounts[1]), 0, "Locked balance should be 0");
        assert(in2.mint(accounts[1], 1), "mint() failed");
        assert.equal(await in2.balanceOf(accounts[1]), 1, "Balance should be 1");
        assert.equal(await in2.lockedBalanceOf(accounts[1]), 0, "Locked balance should be 0");
    });

    it("mintBatch", async function() {
        assert.equal(await in2.balanceOf(accounts[2]), 0, "Balance 0 should be 0");
        assert.equal(await in2.lockedBalanceOf(accounts[2]), 0, "Locked balance 0 should be 0");
        assert.equal(await in2.balanceOf(accounts[3]), 0, "Balance 1 should be 0");
        assert.equal(await in2.lockedBalanceOf(accounts[3]), 0, "Locked balance 1 should be 0");
        await assertReverted(in2.mintBatch([accounts[2], accounts[3]], [2]), "Invalid mintBatch() succeeded");
        await assertReverted(in2.mintBatch(new Array(1025), new Array(1025)), "Minted too many accounts");
        assert(await in2.mintBatch([accounts[2], accounts[3]], [2, 3]), "mintBatch() failed");
        assert.equal(await in2.balanceOf(accounts[2]), 2, "Balance 0 should be 2");
        assert.equal(await in2.lockedBalanceOf(accounts[2]), 0, "Locked balance 0 should be 0");
        assert.equal(await in2.balanceOf(accounts[3]), 3, "Balance 1 should be 3");
        assert.equal(await in2.lockedBalanceOf(accounts[3]), 0, "Locked balance 1 should be 0");
    });

    it("mintUnlockTime", async function() {
        await assertReverted(in2.mintUnlockTime(accounts[4], 1, 0), "Invalid unlock time");
        assert.equal(await in2.balanceOf(accounts[4]), 0, "Balance should be 0");
        assert.equal(await in2.lockedBalanceOf(accounts[4]), 0, "Locked balance should be 0");
        var unlockTime = now() + YEAR;
        assert(await in2.mintUnlockTime(accounts[4], 1, unlockTime), "mintUnlockTime() failed");
        assert.equal(await in2.balanceOf(accounts[4]), 1, "Balance should be 1");
        assert.equal(await in2.lockedBalances(accounts[4], 0), 1, "Locked balance should be 1");
        assertAlmostEqual(await in2.unlockTimes(accounts[4], 0), unlockTime, "Unlock time should be 1 year");
        assert.equal(await in2.lockedBalanceOf(accounts[4]), 1, "Locked balance should be 1");
    });

    it("mintUnlockTimeBatch", async function() {
        assert.equal(await in2.balanceOf(accounts[5]), 0, "Balance 0 should be 0");
        assert.equal(await in2.lockedBalanceOf(accounts[5]), 0, "Locked balance 0 should be 0");
        assert.equal(await in2.balanceOf(accounts[6]), 0, "Balance 1 should be 0");
        assert.equal(await in2.lockedBalanceOf(accounts[6]), 0, "Locked balance 1 should be 0");
        var unlockTime = now() + YEAR;
        await assertReverted(in2.mintUnlockTimeBatch([accounts[5], accounts[6]], [2], unlockTime), "Invalid mintUnlockTimeBatch() succeeded");
        await assertReverted(in2.mintUnlockTimeBatch(new Array(1025), new Array(1025), unlockTime), "Minted too many accounts");
        assert(await in2.mintUnlockTimeBatch([accounts[5], accounts[6]], [2, 3], unlockTime), "mintUnlockTimeBatch() failed");
        assert.equal(await in2.balanceOf(accounts[5]), 2, "Balance 0 should be 2");
        assert.equal(await in2.lockedBalanceOf(accounts[5]), 2, "Locked balance 0 should be 2");
        assert.equal(await in2.balanceOf(accounts[6]), 3, "Balance 1 should be 3");
        assert.equal(await in2.lockedBalanceOf(accounts[6]), 3, "Locked balance 1 should be 3");
    });

    it("mintLockPeriod", async function() {
        assert.equal(await in2.balanceOf(accounts[7]), 0, "Balance should be 0");
        assert.equal(await in2.lockedBalanceOf(accounts[7]), 0, "Locked balance should be 0");
        var unlockTime = now() + 1;
        assert(await in2.mintLockPeriod(accounts[7], 1, 1), "mintLockPeriod() failed");
        assert.equal(await in2.balanceOf(accounts[7]), 1, "Balance should be 1");
        assert.equal(await in2.lockedBalances(accounts[7], 0), 1, "Locked balance should be 1");
        assertAlmostEqual(await in2.unlockTimes(accounts[7], 0), unlockTime, "Unlock time should be 1 second");
        await sleep(2);
        assert.equal(await in2.lockedBalanceOf(accounts[7]), 0, "Locked balance should be 0");
    });

    it("mintLockPeriodBatch", async function() {
        assert.equal(await in2.balanceOf(accounts[8]), 0, "Balance 0 should be 0");
        assert.equal(await in2.lockedBalanceOf(accounts[8]), 0, "Locked balance 0 should be 0");
        assert.equal(await in2.balanceOf(accounts[9]), 0, "Balance 1 should be 0");
        assert.equal(await in2.lockedBalanceOf(accounts[9]), 0, "Locked balance 1 should be 0");
        var unlockTime = now() + DAY;
        await assertReverted(in2.mintLockPeriodBatch([accounts[8], accounts[9]], [2], DAY), "Invalid mintLockPeriodBatch() succeeded");
        await assertReverted(in2.mintLockPeriodBatch(new Array(1025), new Array(1025), DAY), "Minted too many accounts");
        assert(await in2.mintLockPeriodBatch([accounts[8], accounts[9]], [2, 3], DAY), "mintLockPeriodBatch() failed");
        assert.equal(await in2.balanceOf(accounts[8]), 2, "Balance 0 should be 2");
        assert.equal(await in2.lockedBalanceOf(accounts[8]), 2, "Locked balance 0 should be 2");
        assert.equal(await in2.balanceOf(accounts[9]), 3, "Balance 1 should be 3");
        assert.equal(await in2.lockedBalanceOf(accounts[9]), 3, "Locked balance 1 should be 3");
    });

    it("importBalance", async function() {
        assert(!await in2.imported(accounts[4]), "Account balance imported");
        var balance = await in2.balanceOf(accounts[4]);
        var lockedBalance = await in2.lockedBalanceOf(accounts[4]);
        await assertReverted(in2.importBalance(accounts[1]), "Imported zero balance");
        assert(await in2.importBalance(accounts[4]), "importBalance() failed");
        assert((await in2.balanceOf(accounts[4])).minus(balance).equals(10**18), "Balance should have increased by 10**18");
        assert((await in2.lockedBalances(accounts[4], 1)).equals(10**18), "Locked balance be 10**18");
        assertAlmostEqual(await in2.unlockTimes(accounts[4], 1), in1UnlockTime, "Lock period should be 1 year");
        assert((await in2.lockedBalanceOf(accounts[4])).minus(lockedBalance).equals(10**18), "Locked balance should have increased by 10**18");
        assert(await in2.imported(accounts[4]), "Account balance not imported");
        await assertReverted(in2.importBalance(accounts[4]), "Repeated import");
    });

    it("importBalanceBatch", async function() {
        assert(!await in2.imported(accounts[5]), "Account balance 0 imported");
        assert(!await in2.imported(accounts[6]), "Account balance 1 imported");
        var balance0 = await in2.balanceOf(accounts[5]);
        var balance1 = await in2.balanceOf(accounts[6]);
        var lockedBalance0 = await in2.lockedBalanceOf(accounts[5]);
        var lockedBalance1 = await in2.lockedBalanceOf(accounts[6]);
        await assertReverted(in2.importBalanceBatch(new Array(1025)), "Imported too many accounts");
        await assertReverted(in2.importBalanceBatch([accounts[1]]), "Imported zero balance");
        assert(await in2.importBalanceBatch([accounts[5], accounts[6]]), "importBalanceBatch() failed");
        assert((await in2.balanceOf(accounts[5])).minus(balance0).equals(2*10**18), "Balance 0 should have increased by 2*10**18");
        assert((await in2.balanceOf(accounts[6])).minus(balance1).equals(3*10**18), "Balance 1 should have increased by 3*10**18");
        assert((await in2.lockedBalanceOf(accounts[5])).minus(lockedBalance0).equals(2*10**18), "Locked balance 0 should have increased by 2*10**18");
        assert((await in2.lockedBalanceOf(accounts[6])).minus(lockedBalance1).equals(3*10**18), "Locked balance 1 should have increased by 3*10**18");
        assert(await in2.imported(accounts[5]), "Account balance 0 not imported");
        assert(await in2.imported(accounts[6]), "Account balance 1 not imported");
        await assertReverted(in2.importBalanceBatch([accounts[5], accounts[6]]), "Repeated import");
    });

    it("relock", async function() {
        var unlockTime = now() + 90*DAY;
        assert(await in2.relock(accounts[9], 3, await in2.unlockTimes(accounts[9], 0), 90*DAY), "relock() failed");
        assertAlmostEqual(await in2.unlockTimes(accounts[9], 0), unlockTime, "Lock period should be 90 days");
        unlockTime = now() + YEAR;
        assert(await in2.relock(accounts[9], 3, await in2.unlockTimes(accounts[9], 0), -1), "relock() failed");
        assertAlmostEqual(await in2.unlockTimes(accounts[9], 0), unlockTime, "Lock period should be 1 year");
    });

    it("relockPart", async function() {
        var oldUnlockTime = (await in2.unlockTimes(accounts[9], 0)).toNumber();
        var newUnlockTime = now() + DAY;
        await assertReverted(in2.relockPart(accounts[9], 3, oldUnlockTime, 0, DAY), "Relocked amount of 0");
        await assertReverted(in2.relockPart(accounts[9], 3, oldUnlockTime, 4, DAY), "Relocked amount exceeds balance");
        assert(await in2.relockPart(accounts[9], 3, oldUnlockTime, 1, DAY), "relockPart() failed");
        assert.equal(await in2.balanceOf(accounts[9]), 3, "Balance should remain 3");
        assert.equal(await in2.lockedBalances(accounts[9], 0), 2, "Old balance portion should be 2");
        assert.equal(await in2.lockedBalances(accounts[9], 1), 1, "First new balance portion should be 1");
        assertAlmostEqual(await in2.unlockTimes(accounts[9], 0), oldUnlockTime, "Old lock period should remain 90 days");
        assertAlmostEqual(await in2.unlockTimes(accounts[9], 1), newUnlockTime, "First new lock period should be 1 day");
        assert.equal(await in2.lockedBalanceOf(accounts[9]), 3, "Locked balance should remain 3");
        newUnlockTime = now() + YEAR;
        assert(await in2.relockPart(accounts[9], 2, oldUnlockTime, 1, -1), "relockPart() failed");
        assert.equal(await in2.balanceOf(accounts[9]), 3, "Balance should remain 3");
        assert.equal(await in2.lockedBalances(accounts[9], 0), 1, "Old balance portion should be 1");
        assert.equal(await in2.lockedBalances(accounts[9], 2), 1, "Second new balance portion should be 1");
        assertAlmostEqual(await in2.unlockTimes(accounts[9], 0), oldUnlockTime, "Old lock period should remain 90 days");
        assertAlmostEqual(await in2.unlockTimes(accounts[9], 2), newUnlockTime, "Second new lock period should be 1 YEAR");
        assert.equal(await in2.lockedBalanceOf(accounts[9]), 3, "Locked balance should remain 3");
    });

    it("finishMinting", async function() {
        assert(!await in2.mintingFinished(), "Minting is finished");
        assert(await in2.finishMinting(), "finishMinting() failed");
        assert(await in2.mintingFinished(), "Minting is not finished");
    });

    it("transfer", async function() {
        assert.equal(await in2.balanceOf(accounts[2]), 2, "Balance should be 2");
        assert.equal(await in2.balanceOf(accounts[7]), 1, "Balance should be 1");
        assert(!await in2.paused(), "Paused");
        await assertReverted(in2.transfer(accounts[7], 3, {from: accounts[2]}), "Transfer of non-existent balance");
        await in2.pause();
        await assertReverted(in2.transfer(accounts[7], 1, {from: accounts[2]}), "Transfer while paused");
        await in2.unpause();
        await in2.transfer(accounts[7], 1, {from: accounts[2]});
        assert.equal(await in2.balanceOf(accounts[2]), 1, "Balance should be 1");
        assert.equal(await in2.balanceOf(accounts[7]), 2, "Balance should be 2");
    });

    it("transferFrom", async function() {
        assert.equal(await in2.balanceOf(accounts[2]), 1, "Balance should be 1");
        assert.equal(await in2.balanceOf(accounts[7]), 2, "Balance should be 2");
        assert(!await in2.paused(), "Paused");
        await assertReverted(in2.transferFrom(accounts[2], accounts[7], 2), "Transfer of non-existent balance");
        await in2.pause();
        await assertReverted(in2.transferFrom(accounts[2], accounts[7], 1), "Transfer while paused");
        await in2.unpause();
        await assertReverted(in2.transferFrom(accounts[2], accounts[7], 1), "Unapproved transfer");
        await in2.approve(accounts[0], 1, {from: accounts[2]});
        await in2.transferFrom(accounts[2], accounts[7], 1);
        assert.equal(await in2.balanceOf(accounts[2]), 0, "Balance should be 0");
        assert.equal(await in2.balanceOf(accounts[7]), 3, "Balance should be 3");
    });

    it("selfDestruct", async function() {
        assert.equal(await in2.successor(), "0x0000000000000000000000000000000000000000", "Successor should not be defined");
        await assertReverted(in2.selfDestruct(accounts[8]), "Not paused");
        await in2.pause();
        await in2.selfDestruct(accounts[8]);
        assert.equal(await in2.successor(), "0x0", "Contract still exists");
    });

});
