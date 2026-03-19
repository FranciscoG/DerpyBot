'use strict';

/***********************************************************************
 * Add a song to a specific playlist
 **/

// location of the dubapi package
let loc = process.cwd() + '/node_modules/dubapi';
const endpoints = require(loc + '/lib/data/endpoints.js');

/**
 * 
 * @this {DubAPI}
 * @param {string} playlistID 
 * @param {string} fkid 
 * @param {string} type 
 * @param {(code: number, data) => void} callback 
 * @returns {boolean}
 */
module.exports = function (playlistID, fkid, type, callback) {
  if (!this._.connected) { return false; }

  var url = endpoints.userPlaylist.replace('%PID%', playlistID) + '/songs';

  var form = { fkid, type };

  this._.reqHandler.queue({ method: 'POST', url, form }, callback);

  return true;
};