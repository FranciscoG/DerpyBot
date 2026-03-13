'use strict';
const https = require('https');
const _private = require(process.cwd() + '/private/get');
const settings = _private.settings;

/*
  OpenAI Chat Completions endpoint
  Docs: https://platform.openai.com/docs/api-reference/chat

  Expected settings.js addition:
    OPENAI_TOKEN: 'your_openai_api_key'

  Optional settings.js additions:
    OPENAI_MODEL:  model to use (defaults to 'gpt-4o-mini')
    OPENAI_SYSTEM: system prompt to set the bot's personality

  This module:
    1. Sends the user's message to OpenAI with a configurable system prompt.
    2. Returns the assistant's reply directly to chat.
    3. Keeps a short in-memory conversation history per user for context.
*/

// In-memory conversation history keyed by username.
// Stores the last MAX_HISTORY exchanges per user.
var userHistory = {};
var MAX_HISTORY = 6; // number of messages (user+assistant pairs) to retain

var DEFAULT_SYSTEM = (
  'You are DerpyBot, a fun and friendly music room bot. ' +
  'Keep your responses short, casual, and relevant to music when possible. ' +
  'Do not use markdown formatting.'
);

/**
 * Get or initialize conversation history for a user.
 * @param {string} username
 * @returns {Array}
 */
function getHistory(username) {
  if (!userHistory[username]) {
    userHistory[username] = [];
  }
  return userHistory[username];
}

/**
 * Trim history to MAX_HISTORY messages, always preserving pairs.
 * @param {Array} history
 */
function trimHistory(history) {
  while (history.length > MAX_HISTORY) {
    history.splice(0, 2);
  }
}

/**
 * POST to the OpenAI chat completions endpoint.
 * @param {string}   token    OpenAI API key
 * @param {Array}    messages Full messages array (system + history + current)
 * @param {string}   model    Model name
 * @param {Function} callback function(err, replyText)
 */
function queryOpenAI(token, messages, model, callback) {
  var body = JSON.stringify({
    model: model,
    messages: messages,
    max_tokens: 150,
    temperature: 0.8
  });

  var options = {
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  var req = https.request(options, function(res) {
    var data = '';
    res.on('data', function(chunk) { data += chunk; });
    res.on('end', function() {
      if (res.statusCode !== 200) {
        return callback(new Error('OpenAI returned status ' + res.statusCode + ': ' + data));
      }
      try {
        var parsed = JSON.parse(data);
        var reply = parsed.choices &&
                    parsed.choices[0] &&
                    parsed.choices[0].message &&
                    parsed.choices[0].message.content;
        if (!reply) {
          return callback(new Error('Unexpected OpenAI response shape'));
        }
        callback(null, reply.trim());
      } catch (e) {
        callback(new Error('Failed to parse OpenAI response: ' + e.message));
      }
    });
  });

  req.on('error', function(e) {
    callback(e);
  });

  req.write(body);
  req.end();
}

/**
 * Main export — drop-in replacement for wit.js / cleverbot.js.
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
    bot.sendChat('What\'s up?');
    return;
  }

  var token = settings.OPENAI_TOKEN;
  if (!token) {
    bot.log('error', 'BOT', '[OpenAI] OPENAI_TOKEN is not set in settings.js');
    bot.sendChat('My AI brain is not configured right now.');
    return;
  }

  var model = settings.OPENAI_MODEL || 'gpt-4o-mini';
  var systemPrompt = settings.OPENAI_SYSTEM || DEFAULT_SYSTEM;
  var userMessage = data.params.join(' ');
  var username = data.user && data.user.username ? data.user.username : 'unknown';

  var history = getHistory(username);

  // Build messages array: system + history + new user message
  var messages = [{ role: 'system', content: systemPrompt }]
    .concat(history)
    .concat([{ role: 'user', content: userMessage }]);

  bot.log('info', 'BOT', '[OpenAI] user=' + username + ' message=' + userMessage);

  queryOpenAI(token, messages, model, function(err, reply) {
    if (err) {
      bot.log('error', 'BOT', '[OpenAI] ' + err.message);
      bot.sendChat('I had trouble thinking of a response, try again.');
      return;
    }

    // Store the exchange in history for this user
    history.push({ role: 'user', content: userMessage });
    history.push({ role: 'assistant', content: reply });
    trimHistory(history);

    bot.log('info', 'BOT', '[OpenAI] reply=' + reply);
    bot.sendChat('@' + username + ' ' + reply);
  });
};
