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


contract('InsightsNetwork1', function(accounts) {

    var in1;

    before(async function() {
        in1 = await InsightsNetwork1.new();
    });

    it("InsightsNetwork1", async function() {
        assert.equal(await in1.totalSupply(), 0, "Non-zero totalSupply");
        assert(await in1.active(), "Not active");
    });

    it("register", async function() {
        assert.equal(await in1.balanceOf(accounts[1]), 0, "Balance should not exist");
        in1.register(accounts[1], 1);
        assert.equal(await in1.balanceOf(accounts[1]), 1, "Balance should be 1");
    });

    it("makeSuccessor", async function() {
        assert.equal(await in1.successor(), 0, "Successor already exists");
        await in1.makeSuccessor(accounts[2]);
        assert.equal(await in1.successor(), accounts[2], "Successor incorrect");
    });

    it("deactivate", async function() {
        assert(await in1.active(), "Not active");
        in1.deactivate();
        assert(!await in1.active(), "Still active");
    });

});
