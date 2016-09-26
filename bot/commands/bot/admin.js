'use strict';
var settings = require(process.cwd() + '/private/settings.js');
var checkPath = require(process.cwd() + '/utilities/checkPath.js');

module.exports = function(bot, db, data) {
  if (!bot) { return; }

  var userName = checkPath(data, 'data.user.username') || null;
  if (!userName) { return; }

  // check if person sending chat is the owner
  if (userName !== settings.OWNER) {
    return bot.sendChat('Sorry I only take admin commands from my master');
  }

  // now we can assume all chats are from owner
  
  // if messages was just '!admin' without a any arguments
  if (typeof(data.params) === 'undefined' || data.params.length === 0) {
    bot.sendChat('What would you like me to do master?');
    return;
  }

  // now to go through possible commands
  // !admin command extra stuff  
  var command =  data.params[0];
  var extra = data.params.slice(1);
  switch(command) {
    case 'restart':
      bot.sendChat(':recycle: brb! :recycle: ');
      process.exit(1);
      break;
    // more commands to come
    default:
    break;
  }

};