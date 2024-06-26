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
  return bot.sendChat('*firstplay* has been disabled cause it did not work. :frowning:');

  var currentSong = mediaStore.getCurrent();
  
  repo.getSong(db, currentSong.id)
    .then(function(data){
      let val = data.val();
      if (val) {
        var when = moment(val.firstplay.when).fromNow();
        bot.sendChat(`${val.name} was first played ${when} by ${val.firstplay.user}`);
      }
    }).catch(function(err){
      // maybe do something ¯\_(ツ)_/¯
    });

};