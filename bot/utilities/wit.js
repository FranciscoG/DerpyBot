'use strict';
const https = require('https');
const _private = require(process.cwd() + '/private/get');
const settings = _private.settings;

/*
  Wit.ai /message endpoint
  Docs: https://wit.ai/docs/http/20230215/#get__message_link

  Expected settings.js addition:
    WITAI_TOKEN: 'your_server_access_token'

  The response shape from Wit.ai:
  {
    "text": "original message",
    "intents": [ { "id": "...", "name": "intent_name", "confidence": 0.99 } ],
    "entities": { "wit$location:location": [...], ... },
    "traits": { "wit$sentiment": [...], ... }
  }

  This module:
    1. Calls the Wit.ai /message endpoint with the user's text.
    2. Extracts the top intent and any entities.
    3. Routes to a response handler based on intent name.
    4. Falls back to a generic acknowledgment if no intent is matched.

  To extend: add cases to the intentHandlers map below.
*/

var intentHandlers = {
  /*
    Each handler receives (bot, entities, traits, text) and calls bot.sendChat().
    Add your own intents here as you train your Wit.ai app.

    Example:
      'get_weather': function(bot, entities) {
        var loc = getEntityValue(entities, 'wit$location:location');
        bot.sendChat(loc ? 'Weather for ' + loc + '...' : 'Which city?');
      }
  */
  'greeting': function(bot) {
    bot.sendChat('Hey there sexy beast!');
  },
  'bye': function(bot) {
    bot.sendChat('Later !');
  }
};

/**
 * Safely extract the first entity value from a Wit.ai entities object.
 * @param {Object} entities
 * @param {string} key  Full entity key e.g. "wit$location:location"
 * @returns {string|null}
 */
function getEntityValue(entities, key) {
  var arr = entities && entities[key];
  if (arr && arr.length > 0) {
    return arr[0].value || arr[0].body || null;
  }
  return null;
}

/**
 * Query the Wit.ai /message endpoint.
 * @param {string} token   Server access token
 * @param {string} message Raw user message text
 * @param {Function} callback  function(err, parsedBody)
 */
function queryWit(token, message, callback) {
  var encoded = encodeURIComponent(message);
  var options = {
    hostname: 'api.wit.ai',
    path: '/message?v=20230215&q=' + encoded,
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/json'
    }
  };

  var req = https.request(options, function(res) {
    var body = '';
    res.on('data', function(chunk) { body += chunk; });
    res.on('end', function() {
      if (res.statusCode !== 200) {
        return callback(new Error('Wit.ai returned status ' + res.statusCode));
      }
      try {
        callback(null, JSON.parse(body));
      } catch (e) {
        callback(new Error('Failed to parse Wit.ai response: ' + e.message));
      }
    });
  });

  req.on('error', function(e) {
    callback(e);
  });

  req.end();
}

/**
 * Main export — drop-in replacement for cleverbot.js.
 * Called from chat-message.js when a user @-mentions the bot.
 *
 * @param {Object} bot   DubAPI instance
 * @param {Object} db    Firebase instance (unused here but kept for interface parity)
 * @param {Object} data  Chat event data; data.params contains the message tokens
 */
module.exports = function(bot, db, data) {
  if (!bot) {
    return;
  }

  if (!data.params || data.params.length < 1) {
    bot.sendChat('How can I help?');
    return;
  }

  var token = settings.WITAI_TOKEN;
  if (!token) {
    bot.log('error', 'BOT', '[Wit.ai] WITAI_TOKEN is not set in settings.js');
    bot.sendChat('My AI brain is not configured right now.');
    return;
  }

  var message = data.params.join(' ');

  queryWit(token, message, function(err, result) {
    if (err) {
      bot.log('error', 'BOT', '[Wit.ai] ' + err.message);
      bot.sendChat('I had trouble understanding that, try again.');
      return;
    }

    var intents = result.intents || [];
    var entities = result.entities || {};
    var traits = result.traits || {};
    var topIntent = intents.length > 0 ? intents[0].name : null;

    bot.log('info', 'BOT', '[Wit.ai] intent=' + (topIntent || 'none') + ' text=' + message);

    if (topIntent && intentHandlers[topIntent]) {
      return intentHandlers[topIntent](bot, entities, traits, message);
    }

    // No matched intent — acknowledge the message generically.
    // Replace this with whatever fallback behaviour you want.
    bot.sendChat('I heard you but I\'m not sure how to respond to that.');
  });
};
