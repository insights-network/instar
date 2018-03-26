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

var InsightsNetworkContributions = artifacts.require("InsightsNetworkContributions");


function AssertVMError(error) {
    assert(error.message.startsWith("VM Exception"), error.actual);
}


contract('InsightsNetworkContributions', function(accounts) {

    var contributions;

    before(function() {
        return InsightsNetworkContributions.new("Tier Zero", 150, 10, 100, web3.toWei(100, 'gwei')).then(function(instance) {
            contributions = instance;
        });
    });

    it("register", function() {
        return contributions.register(accounts[1], true).then(function() {
            return contributions.registered(accounts[1]);
        }).then(function(registered) {
            assert(registered, "Account unapproved");
        });
    });

    it("registerMultiple", function() {
        return contributions.registerMultiple([accounts[2], accounts[3]], true).then(function() {
            return contributions.registered(accounts[2]);
        }).then(function(registered) {
            assert(registered, "Account unapproved");
            return contributions.registered(accounts[3]);
        }).then(function(registered) {
            assert(registered, "Account unapproved");
            return contributions.registerMultiple([accounts[3]], false);
        }).then(function() {
            return contributions.registered(accounts[3]);
        }).then(function(registered) {
            assert(!registered, "Account approved");
        });
    });

    it("[fallback function]", function() {
        return contributions.sendTransaction({value: 50, from: accounts[1]}).then(function() {
            assert.fail("Contributions disabled");
        }).catch(function(error) {
            AssertVMError(error);
        }).then(function() {
            return contributions.enable(true);
        }).then(function() {
            return contributions.sendTransaction({value: 50, from: accounts[1], gasPrice: web3.toWei(200, 'gwei')});
        }).then(function() {
            assert.fail("Exceeded gas price maximum");
        }).catch(function(error) {
            AssertVMError(error);
        }).then(function() {
            return contributions.sendTransaction({value: 50, from: accounts[3]});
        }).then(function() {
            assert.fail("Unregistered contribution");
        }).catch(function(error) {
            AssertVMError(error);
        }).then(function() {
            return contributions.sendTransaction({value: 50, from: accounts[4]});
        }).then(function() {
            assert.fail("Unregistered contribution");
        }).catch(function(error) {
            AssertVMError(error);
        }).then(function() {
            return contributions.sendTransaction({value: 5, from: accounts[1]});
        }).then(function() {
            assert.fail("Below-minimum contribution");
        }).catch(function(error) {
            AssertVMError(error);
        }).then(function() {
            return contributions.sendTransaction({value: 200, from: accounts[1]});
        }).then(function() {
            assert.fail("Above-maximum contribution");
        }).catch(function(error) {
            AssertVMError(error);
        }).then(function() {
            return contributions.sendTransaction({value: 50, from: accounts[1]});
        }).then(function() {
            return contributions.balances(accounts[1]);
        }).then(function(balance) {
            assert.equal(balance, 50, "Contribution failed");
        });
    });

    it("contribute", function() {
        return contributions.contribute({value: 50, from: accounts[1]}).then(function() {
            return contributions.balances(accounts[1]);
        }).then(function(balance) {
            assert.equal(balance, 100, "Second contribution failed");
        }).then(function() {
            return contributions.contribute({value: 1, from: accounts[1]});
        }).then(function() {
            assert.fail("Exceeded contribution total limit");
        }).catch(function(error) {
            AssertVMError(error);
        }).then(function() {
            return contributions.contribute({value: 60, from: accounts[2]});
        }).then(function() {
            assert.fail("Exceeded cap");
        }).catch(function(error) {
            AssertVMError(error);
        }).then(function() {
            return web3.eth.getBalance(contributions.address);
        }).then(function(balance) {
            assert.equal(balance.toNumber(), 100, "Wrong balance");
        });
    });

    it("transfer", function() {
        var balance1;
        var balance2;
        return contributions.name().then(function() {
            return web3.eth.getBalance(accounts[1]);
        }).then(function(balance) {
            balance1 = balance.toNumber();
            return web3.eth.getBalance(accounts[2]);
        }).then(function(balance) {
            balance2 = balance.toNumber();
            return contributions.transfer(accounts[1], 200);
        }).then(function() {
            assert.fail("Transfer exceeds balance");
        }).catch(function(error) {
            AssertVMError(error);
        }).then(function() {
            return contributions.transfer(accounts[1], 50);
        }).then(function() {
            return web3.eth.getBalance(accounts[1]);
        }).then(function(balance) {
            assert.equal(balance.toNumber(), balance1 + 50, "Transfer failed");
            return contributions.transfer(accounts[2], 50);
        }).then(function() {
            return web3.eth.getBalance(accounts[2]);
        }).then(function(balance) {
            assert.equal(balance.toNumber(), balance2 + 50, "Transfer failed");
            return web3.eth.getBalance(contributions.address);
        }).then(function(balance) {
            assert.equal(balance.toNumber(), 0, "Non-zero balance remaining");
        });
    });

    it("enable", function() {
        return contributions.selfDestruct().then(function() {
            assert.fail("Contract enabled");
        }).catch(function(error) {
            AssertVMError(error);
        });
    });

    it("selfDestruct", function() {
        return contributions.enable(false).then(function() {
            return contributions.selfDestruct();
        });
    });

});
