'use strict';
var lastfm = require(process.cwd() + '/bot/utilities/lastfm.js');
var mediaStore = require(process.cwd() + '/bot/store/mediaInfo.js');

/**
 * Looks up how many times the Last.fm account has played a track.
 *
 * Usage:
 *   !playcount              — uses the currently playing song
 *   !playcount Artist - Title  — looks up a specific track
 *
 * @param  {DubAPI} bot  dubapi instance
 * @param  {object} db   Firebase instance (unused, kept for interface parity)
 * @param  {object} data Room info object
 */
module.exports = function(bot, db, data) {
  var name;

  if (data.params && data.params.length > 0) {
    // user provided a search string
    name = data.params.join(' ');
  } else {
    // fall back to currently playing song
    var currentSong = mediaStore.getCurrent();
    if (!currentSong || !currentSong.name) {
      return bot.sendChat('No song is currently playing. Try !playcount Artist - Title.');
    }
    name = currentSong.name;
  }

  var parsed = lastfm.parseName(name);

  lastfm.getPlays(parsed.artist, parsed.track, function(err, plays) {
    if (err) {
      bot.log('error', 'BOT', '[playcount] ' + err.message);
      return bot.sendChat('Could not retrieve play count from Last.fm right now.');
    }

    if (plays === 0) {
      bot.sendChat(`*${parsed.artist} - ${parsed.track}* has not been played on Last.fm yet.`);
    } else if (plays === 1) {
      bot.sendChat(`*${parsed.artist} - ${parsed.track}* has been played 1 time on Last.fm.`);
    } else {
      bot.sendChat(`*${parsed.artist} - ${parsed.track}* has been played ${plays} times on Last.fm.`);
    }
  });
};
