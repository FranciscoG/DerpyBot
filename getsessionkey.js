'use strict';
/*
  One-time script to retrieve a Last.fm session key.
  Run with: node getSessionKey.js

  Copy the session key output into your settings.js as LASTFM_SESSION_KEY.
  The session key does not expire and only needs to be generated once.
*/

const https = require('https');
const crypto = require('crypto');

// Fill these in before running
var API_KEY    = '033b54b67ff65b775c3c62675f2f4922';
var API_SECRET = 'a247227ed4e740ea36e760475cdbc142';
var USERNAME   = 'nitrous303';
var PASSWORD   = '87jg^hDx&u&T@WJ%En';

if (!API_KEY || !API_SECRET || !USERNAME || !PASSWORD) {
  console.error('Fill in API_KEY, API_SECRET, USERNAME, and PASSWORD before running.');
  process.exit(1);
}

/**
 * Build a Last.fm API signature.
 * Params must be sorted alphabetically by key, concatenated as key+value pairs,
 * then appended with the secret and MD5 hashed.
 * @param {Object} params
 * @param {string} secret
 * @returns {string}
 */
function sign(params, secret) {
  var str = Object.keys(params)
    .sort()
    .map(function(k) { return k + params[k]; })
    .join('');
  return crypto.createHash('md5').update(str + secret, 'utf8').digest('hex');
}

function getMobileSession(callback) {
  var params = {
    method:   'auth.getMobileSession',
    api_key:  API_KEY,
    username: USERNAME,
    password: PASSWORD,
    format:   'json'
  };

  // Signature must be built before adding format (format is excluded from sig)
  var sigParams = {
    method:   params.method,
    api_key:  params.api_key,
    username: params.username,
    password: params.password
  };
  params.api_sig = sign(sigParams, API_SECRET);

  var body = Object.keys(params)
    .map(function(k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
    .join('&');

  var options = {
    hostname: 'ws.audioscrobbler.com',
    path:     '/2.0/',
    method:   'POST',
    headers: {
      'Content-Type':   'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  var req = https.request(options, function(res) {
    var data = '';
    res.on('data', function(chunk) { data += chunk; });
    res.on('end', function() {
      try {
        var parsed = JSON.parse(data);
        if (parsed.error) {
          return callback(new Error('Last.fm error ' + parsed.error + ': ' + parsed.message));
        }
        callback(null, parsed.session.key);
      } catch (e) {
        callback(new Error('Failed to parse response: ' + e.message));
      }
    });
  });

  req.on('error', callback);
  req.write(body);
  req.end();
}

getMobileSession(function(err, sessionKey) {
  if (err) {
    console.error('Failed to get session key:', err.message);
    process.exit(1);
  }
  console.log('\nSuccess! Add this to your settings.js:\n');
  console.log('  LASTFM_API_KEY:     \'' + API_KEY + '\'');
  console.log('  LASTFM_SECRET:      \'' + API_SECRET + '\'');
  console.log('  LASTFM_SESSION_KEY: \'' + sessionKey + '\'');
  console.log('\nThe session key does not expire.');
});
