/*
 * Module: songstats
 * Keeps a count of the number of times a song is added to a users playlist, and at the end of the song speaks in chat the number of awesomes, lames, and snags the song got.
 * Use /songstats [on|off] to turn it on or off.
 */

const {
  log
} = require("util");

var customEvents = [{
    on: 'endsong',
    event: function (bot, data) {
      bot.log("endsong: ", data);
      if (bot.session.snags == undefined)
        bot.session.snags = [];
      if (bot.settings.songstats == undefined)
        bot.settings.songstats = true;
      if (bot.session.lastsongstats == undefined)
        bot.session.lastsongstats = {};

      if (bot.settings.songstats) {
        var song = data.room.metadata.current_song;
        bot.session.lastsongstats = {
          upvotes: data.room.metadata.upvotes,
          downvotes: data.room.metadata.downvotes,
          snags: bot.session.snags
        };
      }
      // bot.session.snags = [];
    }
  },
  {
    on: 'newsong',
    setup: function (bot) {
      bot.settings.club420 = Object.assign(bot.settings.club420, []);
      bot.settings.club69 = Object.assign(bot.settings.club69, []);
      bot.saveSettings();
    },
    event: function (bot, data) {
      bot.log("SONGSTATS NEWSONG");
      artist = bot.session.currentSong.metadata.artist;
      track = bot.session.currentSong.metadata.song;
      if (bot.settings.songstats) {
        bot.lastfm.getPlays({
          artist: artist,
          track: track,
          callback: function (result) {
            bot.log("result: ", result);
            var plays = result.plays;
            var mysql = bot.getMysqlClient();
            mysql.query("SELECT s.artist, s.track, sl.starttime " +
              "from song s " +
              "join songlog sl on sl.songid = s.id " +
              "where lower(artist) = '" + mysql_real_escape_string(artist.toLowerCase()) + "' " +
              (track !== false ? "and lower(track) = '" + mysql_real_escape_string(track.toLowerCase()) + "' " : "") +
              "order by sl.starttime desc " +
              "limit 1;",
              function selectCb(err, results, fields) {
                bot.log("results: ", results);
                var time = [];
                if (results.length == 0) {} else {
                  var now = new Date();
                  var diff = now.getTime() - new Date(results[0].starttime).getTime();
                  var x = diff / 1000;
                  var seconds = Math.floor(((x % 86400) % 3600) % 60);
                  var minutes = Math.floor(((x % 86400) % 3600) / 60);
                  var hours = Math.floor((x % 86400) / 3600);
                  var days = Math.floor(x / 86400);
                  if (days > 1)
                    time.push(days + ' days');
                  else {
                    if (days == 1)
                      time.push(days + ' day');
                    if (hours > 0)
                      time.push((hours + " hour") + (hours == 1 ? "" : "s"));
                    else if (minutes > 0)
                      time.push(minutes + ' minutes');
                    else
                      time.push(seconds + ' seconds');
                  }
                }
                var str = "Last Song: 👍 " + bot.session.last_song.votes.up.length + " ⭐ " + (bot.session.last_song.snags.length ? bot.session.last_song.snags.length : '0') + " 👎 " + bot.session.last_song.votes.down.length;
                var str2;
                var str3;
                // str2 = ":musical_note: " + bot.session.currentDJ + " started playing \"" + bot.session.currentSong.metadata.song + "\" by " + bot.session.currentSong.metadata.artist + " :musical_note: ";
                str2 = "🎵" + bot.session.currentDJ + " started playing \"" + bot.session.currentSong.metadata.song + "\" by " + bot.session.currentSong.metadata.artist + "🎵";
                if (result.success !== true || result.plays == 0) {
                  str3 = "Stats: 🆕 to the Mixer!";
                } else {
                  str3 = "Stats: 🔁 " + (result.success === true ? result.plays : '0') + " plays";
                  if (time.length > 0)
                    str3 += " ➡️ " + time.join(', ') + " ago";

                  //                                              var user = bot.session.currentDJ.name;
                  //                                              if(time.join(', ') == '420 days') {
                  //                                                      if(bot.settings.club420.indexOf(user) == -1) {
                  //                                                              bot.log("adding " + user + " to club 420!");
                  //                                                              bot.settings.club420.push(user);
                  //                                                              bot.saveSettings();
                  //                                                      }
                  //                                              } else if(time.join(', ') == '69 days') {
                  //                                                      if(bot.settings.club69.indexOf(user) == -1) {
                  //                                                              bot.log("adding " + user + " to club 69!");
                  //                                                              bot.settings.club69.push(user);
                  //                                                              bot.saveSettings();
                  //                                                              bot.bot.speak("Welcome " + user + " to club 69!", function(result) {
                  //                                                                      bot.bot.speak("http://i.imgur.com/e9KWLxE.gif");
                  //                                                              });
                  //                                                      }
                  //                                              }
                }
                //                                      bot.log("new song data: ", data);
                bot.log(str);
                bot.log(str2);
                bot.bot.speak(str, function () {
                  bot.bot.speak(str2, function () {
                    bot.bot.speak(str3);
                  });
                });

                //                                      });
              }
            );
          }
        });
      }
    }
  },
  {
    on: 'snagged',
    event: function (bot, data) {
      if (bot.session.snags == undefined)
        bot.session.snags = [];
      // bot.session.snags++;
    }
  }
];

var customCommands = [{
    name: 'songstats',
    command: function (options) {
      if (options.bot.settings.songstats == undefined)
        options.bot.settings.songstats = true;
      var text = "";
      if (options.arg == "")
        text = "Song stats are " + (options.bot.settings.songstats ? "on" : "off") + ".";
      else if (options.arg == "on") {
        if (options.bot.settings.songstats)
          text = "Song stats are already on.";
        else {
          options.bot.settings.songstats = true;
          options.bot.saveSettings();
          text = "Song stats are now on.";
        }
      } else if (options.arg == "off") {
        if (!options.bot.settings.songstats)
          text = "Song stats are already off.";
        else {
          options.bot.settings.songstats = false;
          options.bot.saveSettings();
          text = "Song stats are now off.";
        }
      } else {
        text = "Usage: /songstats [on|off]";
      }
      options.bot.bot.pm(text, options.userid);
    },
    permission: 3,
    pmonly: true,
    help: "Turn song stats (the bot will tell the number of awesomes, lames, and snags at the end of each song) on or off."
  },
  {
    name: 'songinfo',
    command: function (options) {
      options.bot.log("snags: ", options.bot.session);
      // options.bot.log("current song: ", options.bot.session.currentSong);
      var song = options.bot.session.currentSong;
      // options.bot.log("snags: ", options.bot.session.snags);
      var str = "Stats for " + song.metadata.song + " by " + song.metadata.artist + ":";
      var str2 = "👍" + options.bot.session.votes.up.length + " ⭐" + (options.bot.session.snags.length ? options.bot.session.snags.length : '0') + " 👎" + options.bot.session.votes.down.length;
      options.bot.speakOrPM(str, options.pm, options.userid, function () {
        options.bot.speakOrPM(str2, options.pm, options.userid);
      });
    },
    permission: 0,
    pmonly: false,
    help: 'Get song stats for the currently playing song.'
  },
  {
    name: '420',
    command: function (options) {
      options.bot.speakOrPM("Club 420! If your song's last play was 420 days ago you are an official Club 420 Pro Member! Current Members: " + options.bot.settings.club420.join(', '), options.pm, options.userid);
    },
    permission: 0,
    pmonly: false,
    hide: true
  },
  {
    name: '69',
    command: function (options) {
      options.bot.speakOrPM("Club 69! If your song's last play was 69 days ago you are an official Club 69 Pro Member! " + (options.bot.settings.club69.length == 0 ? 'No members yet, so get to it!' : 'Current Members: ' + options.bot.settings.club69.join(', ')), options.pm, options.userid);
    },
    permission: 0,
    pmonly: false,
    hide: true
  },
  {
    name: 'songtest',
    command: function (options) {
      options.bot.log("Curent song: ", options.bot.session.currentSong);
    },
    permission: 4,
    pmonly: true,
    hide: true,
    acl: true
  }
];

exports.customCommands = customCommands;
exports.customEvents = customEvents;


function mysql_real_escape_string(str) {
  return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
    switch (char) {
      case "\0":
        return "\\0";
      case "\x08":
        return "\\b";
      case "\x09":
        return "\\t";
      case "\x1a":
        return "\\z";
      case "\n":
        return "\\n";
      case "\r":
        return "\\r";
      case "\"":
      case "'":
      case "\\":
      case "%":
        return "\\" + char; // prepends a backslash to backslash, percent,
        // and double/single quotes
    }
  });
}
