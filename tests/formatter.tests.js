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

// require our file to test
const triggerFormatter = require("../bot/utilities/trigger-formatter.js");

describe("Trigger Formatter tests", function () {
  it("Should show the first argument", function () {
    var text = "hello @%0|dj%";
    data.params = ["you"];
    var parsed = triggerFormatter(text, bot, data);
    assert.strictEqual(parsed, "hello @you");
  });

  it("only show the defaults", function () {
    data.params = [];

    var text = "hello %0|dj%, do you know %1|me%, because %1|me% am %2|amazing%";
    var parsed = triggerFormatter(text, bot, data);
    assert.strictEqual(parsed, "hello testDJname, do you know testUser, because testUser am amazing");
  });

  it("Should show do replacement with all args given in order", function () {
    var text = "%0% %1% %2% %3% %4% %5% %6% %7%";
    data.params = ["this", "is", "a", "test", "of", "the", "trigger", "system"];
    var parsed = triggerFormatter(text, bot, data);
    assert.strictEqual(parsed, "this is a test of the trigger system");
  });

  it("mixing reserved words with interpolated n", function () {
    var text = "hey you %dj%, %0% said to %me% that you suck";
    data.params = ["yoda"];
    var parsed = triggerFormatter(text, bot, data);
    assert.strictEqual(parsed, "hey you @testDJname, yoda said to testUser that you suck");
  });

  it("with and without reserved word defaults", function () {
    var text = "hey %0|dj%, you are pretty %1|cool%";
    data.params = ["brad"];
    var parsed = triggerFormatter(text, bot, data);
    assert.strictEqual(parsed, "hey brad, you are pretty cool");

    data.params = ["brad", "dumb"];
    parsed = triggerFormatter(text, bot, data);
    assert.strictEqual(parsed, "hey brad, you are pretty dumb");
  });

  it("out of order in the text", function () {
    var text = "%0% hated her %2% because it was full of %3% and %1%";
    data.params = ["sally", "bees", "head", "doodoo"];
    var parsed = triggerFormatter(text, bot, data);
    assert.strictEqual(parsed, "sally hated her head because it was full of doodoo and bees");
  });

  // skipping because spreadsheets is disabled
  it.skip("should get the correct spreadsheet data", function () {
    var text = "%nmm.date% - %nmm.artist% - %nmm.album%";
    bot.sheetsData = bot.sheetsData || {};
    bot.sheetsData.nmm = {
      date: "3/12/2018",
      artist: "Blockhead",
      album: "Funeral Balloons",
    };
    var parsed = triggerFormatter(text, bot, data);
    assert.strictEqual(parsed, "3/12/2018 - Blockhead - Funeral Balloons");
  });
});
