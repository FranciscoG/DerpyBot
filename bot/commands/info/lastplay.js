'use strict';
var lastfm = require(process.cwd() + '/bot/utilities/lastfm.js');
var mediaStore = require(process.cwd() + '/bot/store/mediaInfo.js');
var moment = require('moment');

/**
 * Looks up the last time a track was scrobbled on Last.fm.
 *
 * Usage:
 *   !lastplay              — uses the currently playing song
 *   !lastplay Artist - Title  — looks up a specific track
 *
 * @param  {DubAPI} bot  dubapi instance
 * @param  {object} db   Firebase instance (unused, kept for interface parity)
 * @param  {object} data Room info object
 */
module.exports = function(bot, db, data) {
  var name;

  if (data.params && data.params.length > 0) {
    name = data.params.join(' ');
  } else {
    var currentSong = mediaStore.getCurrent();
    if (!currentSong || !currentSong.name) {
      return bot.sendChat('No song is currently playing. Try !lastplay Artist - Title.');
    }
    name = currentSong.name;
  }

  var parsed = lastfm.parseName(name);

  lastfm.getLastPlay(parsed.artist, parsed.track, function(err, result) {
    if (err) {
      bot.log('error', 'BOT', '[lastplay] ' + err.message);
      return bot.sendChat('Could not retrieve last play info from Last.fm right now.');
    }

    if (!result) {
      return bot.sendChat(`*${parsed.artist} - ${parsed.track}* has not been scrobbled on Last.fm yet.`);
    }

    var when = result.when ? moment(result.when).fromNow() : 'an unknown time ago';
    bot.sendChat(`*${result.artist} - ${result.track}* was last played ${when}.`);
  });
};
