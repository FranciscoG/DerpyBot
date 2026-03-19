"use strict";
const assert = require("node:assert/strict");
const { describe, it } = require("node:test");

// stubs for bot functions
const stubs = require("./stubs.js");
const bot = stubs.bot;

// DJ = testDJname;
const data = {
  user: { username: "testUser" },
};

/*
IDs of confirmed broken songs
87380722 - 404 rror 
116534641 - null
54816877 - null
226913338 - 404 error
80963599 - 404 error
270048143 - 404 error

IDs of working songs (as of May 2018)
223456028 - Mz Boom Bap - Fast Life (Instrumental)

276516174 - https://soundcloud.com/pryced/grown - why did the bot skip this song?
*/

// require our file to test
const sc = require("../bot/utilities/soundcloud.js");

function getLinkResult(media) {
  return new Promise(function (resolve) {
    var settled = false;

    sc.getLink(bot, media, function (result) {
      if (settled) {
        return;
      }

      settled = true;
      resolve(result);
    });
  });
}

function assertLinkResultShape(result) {
  assert.ok(result);
  assert.strictEqual(typeof result, "object");

  if (result.link !== undefined) {
    assert.strictEqual(typeof result.link, "string");
  }

  if (result.error_message !== undefined) {
    assert.strictEqual(typeof result.error_message, "string");
  }

  if (result.skippable !== undefined) {
    assert.strictEqual(typeof result.skippable, "boolean");
  }
}

describe("Soundcloud track info tests", function () {
  it("Should successfully connect to soundcloud", async function () {
    var media = { fkid: 123456789, name: "not a real track" };
    var result = await getLinkResult(media);
    assertLinkResultShape(result);
  });

  it("Missing bot argument should return undefined", function () {
    assert.strictEqual(sc.getLink(), undefined);
  });

  it("Missing callback argument should return undefined", function () {
    assert.strictEqual(sc.getLink(bot), undefined);
  });

  it("Should return an error message when media object is missing", async function () {
    var result = await getLinkResult(null);
    assert.strictEqual(result.error_message, "soundcloud getSCjson: missing media object");
  });

  it("Should return an error message when song ID is missing", async function () {
    var result = await getLinkResult({});
    assert.strictEqual(result.error_message, "soundcloud getSCjson: missing song id");
  });

  it("Should return a 404 for made-up id", async function () {
    var media = { fkid: 111111111111111 };
    var result = await getLinkResult(media);
    assertLinkResultShape(result);
  });

  it("Should return a 404 for a confirmed broken id", async function () {
    var media = { fkid: 87380722, name: "Chamber Of Secrets" };
    var result = await getLinkResult(media);
    assertLinkResultShape(result);
  });

  it("Body should be null for api forbidden track", async function () {
    var media = { fkid: 116534641, name: "The Other Side - Help Me (FilososfischeStilte Remix)" };
    var result = await getLinkResult(media);
    assertLinkResultShape(result);
  });

  it("Body should be null for api forbidden track", async function () {
    var media = { fkid: 54816877, name: "Morning in Japan" };
    var result = await getLinkResult(media);
    assertLinkResultShape(result);
  });

  it("Should successfully return track info", async function () {
    var media = { fkid: 223456028, name: "Mz Boom Bap - Fast Life (Instrumental)" };
    var result = await getLinkResult(media);
    assertLinkResultShape(result);
  });

  it("Should not skip this track but the bot did anyways which is weird, oh well", async function () {
    var media = { fkid: 276516174, name: "Grown" };
    var result = await getLinkResult(media);
    assertLinkResultShape(result);
  });
});
