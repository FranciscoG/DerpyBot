'use strict';
var repo = require(process.cwd()+'/repo');
var mediaStore = require(process.cwd()+ '/bot/store/mediaInfo.js');
var moment = require('moment');

/**
 * Checks the db to see who was the first person who played the current song
 * @param  {DubAPI} bot  dubapi instance
 * @param  {import('firebase-admin').database} db   Firebase instance
 * @param  {object} data Room info object
 */
module.exports = function(bot, db, data) {
  var currentSong = mediaStore.getCurrent();

  if (!currentSong || !currentSong.id) {
    return bot.sendChat('No song is currently playing.');
  }

  repo.getSong(db, currentSong.id)
    .then(function(data){
      var val = data.val();
      if (val && val.firstplay && val.firstplay.when) {
        var when = moment(val.firstplay.when).fromNow();
        bot.sendChat(`*${val.name}* was first played ${when} by ${val.firstplay.user}`);
      } else {
        bot.sendChat(`No play history found for *${currentSong.name}*.`);
      }
    }).catch(function(err){
      bot.log('error', 'BOT', '[firstplay] ' + err.message);
      bot.sendChat('Could not retrieve first play history right now.');
    });
};
