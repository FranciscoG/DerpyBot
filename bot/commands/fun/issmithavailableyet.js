'use strict';

/**
 * @param {DubAPI} bot 
 */
module.exports = function(bot) {
  fetch('https://api.queup.net/user/query/availabilty?username=smith') // this endpoint has a typo, lol
    .then(res => {
      if (res.ok) return res.json();
      else throw new Error(res.status.toString());
    })
    .then(json => {
      if (json.data.taken) {
        bot.sendChat('No, someone still has the username Smith :rage:');
      } else {
        bot.sendChat(':exclamation: THE USERNAME SMITH IS AVAILABLE :exclamation:');
      }
    })
    .catch(err => {
      bot.log('error', 'BOT', `[!issmithavailableyet] ${err.message}`);
      bot.sendChat('Bad request to username availability check...');
    });
};