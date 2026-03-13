'use strict';
const https = require('https');
const crypto = require('crypto');
const _private = require(process.cwd() + '/private/get');
const settings = _private.settings;

/*
  Last.fm API utility
  Docs: https://www.last.fm/api

  Required settings.js entries:
    LASTFM_API_KEY:     'your_api_key'
    LASTFM_SECRET:      'your_shared_secret'
    LASTFM_SESSION_KEY: 'your_session_key'
    LASTFM_USERNAME:    'your_lastfm_username'

  Exports:
    parseName(name)
      Splits "Artist - Title" into { artist, track }.

    scrobble(artist, track, timestamp, callback)
      Records a song play to Last.fm.
      callback(err)

    updateNowPlaying(artist, track, callback)
      Updates the Now Playing status on Last.fm.
      callback(err)

    getPlays(artist, track, callback)
      Returns play count. Two-pass: tries full track name first, then
      strips brackets/parens on retry if not found.
      callback(err, plays)

    getLastPlay(artist, track, callback)
      Returns most recent scrobble. Two-pass: tries full track name first,
      then strips brackets/parens on retry if not found.
      callback(err, result)
        result: { when: Date, artist: string, track: string } or null
*/

// ---------------------------------------------------------------------------
// String helpers
// ---------------------------------------------------------------------------

/**
 * Normalize en/em dashes to hyphen, then split on ' - '.
 * Falls back to Unknown Artist if no separator found.
 * @param {string} name
 * @returns {{ artist: string, track: string }}
 */
function parseName(name) {
  name = name.replace(/\u2013/g, '-').replace(/\u2014/g, '-');
  name = name.replace(/\u2018/g, "'").replace(/\u2019/g, "'").replace(/\u201A/g, "'");
  var idx = name.indexOf(' - ');
  if (idx === -1) {
    return { artist: 'Unknown Artist', track: name.trim() };
  }
  return {
    artist: name.substring(0, idx).trim(),
    track:  name.substring(idx + 3).trim()
  };
}

/**
 * Strip bracketed and parenthetical catalog suffixes Last.fm typically omits.
 * Removes: [NE103], [SPAZIO028], (NE103)
 * Keeps:   (Original Mix), (feat. Someone), (Radio Edit)
 * @param {string} track
 * @returns {string}
 */
function stripSuffixes(track) {
  track = track.replace(/\s*\[[^\]]*\]/g, '');
  track = track.replace(/\s*\([A-Z0-9]{3,}\)/g, '');
  return track.trim();
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function sign(params, secret) {
  var str = Object.keys(params)
    .sort()
    .map(function(k) { return k + params[k]; })
    .join('');
  return crypto.createHash('md5').update(str + secret, 'utf8').digest('hex');
}

function post(params, callback) {
  var apiKey     = settings.LASTFM_API_KEY;
  var secret     = settings.LASTFM_SECRET;
  var sessionKey = settings.LASTFM_SESSION_KEY;

  if (!apiKey || !secret || !sessionKey) {
    return callback(new Error('Last.fm credentials are not set in settings.js'));
  }

  var sigParams = Object.assign({}, params, { api_key: apiKey, sk: sessionKey });
  sigParams.api_sig = sign(sigParams, secret);
  sigParams.format  = 'json';

  var body = Object.keys(sigParams)
    .map(function(k) { return encodeURIComponent(k) + '=' + encodeURIComponent(sigParams[k]); })
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
        callback(null, parsed);
      } catch (e) {
        callback(new Error('Failed to parse Last.fm response: ' + e.message));
      }
    });
  });

  req.on('error', callback);
  req.write(body);
  req.end();
}

function get(params, callback) {
  var apiKey = settings.LASTFM_API_KEY;
  if (!apiKey) {
    return callback(new Error('LASTFM_API_KEY is not set in settings.js'));
  }

  var query = Object.assign({}, params, { api_key: apiKey, format: 'json' });
  var qs = Object.keys(query)
    .map(function(k) { return encodeURIComponent(k) + '=' + encodeURIComponent(query[k]); })
    .join('&');

  var options = {
    hostname: 'ws.audioscrobbler.com',
    path:     '/2.0/?' + qs,
    method:   'GET'
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
        callback(null, parsed);
      } catch (e) {
        callback(new Error('Failed to parse Last.fm response: ' + e.message));
      }
    });
  });

  req.on('error', callback);
  req.end();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function scrobble(artist, track, timestamp, callback) {
  post({
    method:    'track.scrobble',
    artist:    artist,
    track:     track,
    timestamp: Math.floor(timestamp / 1000)
  }, function(err) {
    callback(err || null);
  });
}

function updateNowPlaying(artist, track, callback) {
  post({
    method: 'track.updateNowPlaying',
    artist: artist,
    track:  track
  }, function(err) {
    callback(err || null);
  });
}

/**
 * Get play count. Two-pass lookup — full name first, stripped name on retry.
 */
function getPlays(artist, track, callback) {
  function lookup(trackName, cb) {
    get({
      method:      'track.getInfo',
      artist:      artist,
      track:       trackName,
      username:    settings.LASTFM_USERNAME,
      autocorrect: 1
    }, function(err, data) {
      if (err) {
        if (err.message && err.message.indexOf('error 6') !== -1) { return cb(null, 0); }
        return cb(err, 0);
      }
      cb(null, parseInt(data.track && data.track.userplaycount ? data.track.userplaycount : 0, 10));
    });
  }

  lookup(track, function(err, plays) {
    if (err) { return callback(err, 0); }
    if (plays > 0) { return callback(null, plays); }
    var stripped = stripSuffixes(track);
    if (stripped === track) { return callback(null, 0); }
    lookup(stripped, function(err2, plays2) {
      callback(err2, plays2 || 0);
    });
  });
}

/**
 * Get most recent scrobble. Two-pass lookup — full name first, stripped name on retry.
 */
function getLastPlay(artist, track, callback) {
  var username = settings.LASTFM_USERNAME;
  if (!username) {
    return callback(new Error('LASTFM_USERNAME is not set in settings.js'));
  }

  function lookup(trackName, cb) {
    get({
      method:   'user.getRecentTracks',
      user:     username,
      artist:   artist,
      limit:    200,
      extended: 0
    }, function(err, data) {
      if (err) { return cb(err, null); }
      var tracks = data.recenttracks && data.recenttracks.track;
      if (!tracks || tracks.length === 0) { return cb(null, null); }
      if (!Array.isArray(tracks)) { tracks = [tracks]; }

      var searchTrack = trackName.replace(/\u2018/g, "'").replace(/\u2019/g, "'").toLowerCase().trim();
      var normalize = function(s) { return s.replace(/\u2018/g, "'").replace(/\u2019/g, "'").toLowerCase().trim(); };
      var match = null;
      for (var i = 0; i < tracks.length; i++) {
        var t = tracks[i];
        if (t['@attr'] && t['@attr'].nowplaying) { continue; }
        if (normalize(t.name || '') === searchTrack) { match = t; break; }
      }

      if (!match) { return cb(null, null); }

      cb(null, {
        when:   match.date && match.date.uts ? new Date(parseInt(match.date.uts, 10) * 1000) : null,
        artist: match.artist['#text'] || artist,
        track:  match.name || trackName
      });
    });
  }

  lookup(track, function(err, result) {
    if (err) { return callback(err, null); }
    if (result) { return callback(null, result); }
    var stripped = stripSuffixes(track);
    if (stripped === track) { return callback(null, null); }
    lookup(stripped, function(err2, result2) {
      callback(err2, result2 || null);
    });
  });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  parseName:        parseName,
  scrobble:         scrobble,
  updateNowPlaying: updateNowPlaying,
  getPlays:         getPlays,
  getLastPlay:      getLastPlay
};
