'use strict';
var repo = require(process.cwd()+'/repo');
var mediaStore = require(process.cwd()+ '/bot/store/mediaInfo.js');
var moment = require('moment');

/**
 * Checks the db to see who was the last person who played the current song
 * @param  {Object} bot  dubapi instance
 * @param  {Object} db   Firebase instance
 * @param  {Object} data Room info object
 */
module.exports = function(bot, db, data) {
  var currentSong = mediaStore.getCurrent();
  
  repo.getSong(db, currentSong.id)
    .then(function(data){
      let val = data.val();
      if (val) {
        var when = moment(val.lastplay.when).fromNow();
        bot.sendChat(`${val.name} was last played ${when} by ${val.lastplay.user}`);
      }
    }).catch(function(err){
      // maybe do something ¯\_(ツ)_/¯
    });

};