"use strict";
const Cleverbot = require("./cleverbot-node");
const _private = require(process.cwd() + "/private/get");
const settings = _private.settings;

/**
 * 
 * @param {*} bot 
 * @param {*} db 
 * @param {{params: string[]}} data 
 * @returns 
 */
module.exports = function (bot, db, data) {
  if (!bot) {
    return;
  }

  if (data.params.length < 1) {
    bot.sendChat("how can I be of assistance?");
    return;
  }

  const cleverbot = new Cleverbot();
  cleverbot.configure({ botapi: settings.CLEVERBOT_API_KEY });

  /**
   * 
   * @param {{output: string}} response 
   * @returns 
   */
  function hanleResponse(response) {
    if (!response) {
      return bot.log("error", "BOT", "No response from cleverbot");
    }
    bot.sendChat(response.output);
  }

  cleverbot.write(data.params.join(" "), hanleResponse);
};
