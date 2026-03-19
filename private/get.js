"use strict";

/**
 * @typedef {object} Settings
 * @property {string} OWNER
 * @property {string[]} APPROVED_USERS
 * @property {string} USERNAME
 * @property {string} PASSWORD
 * @property {string} ROOMNAME
 * @property {string} SOUNDCLOUDID
 * @property {string} YT_API
 * @property {string} CLEVERBOT_API_KEY
 * @property {object} FIREBASE
 * @property {string} FIREBASE.BASEURL
 * @property {object} LASTFM
 * @property {string} LASTFM.api_key
 * @property {string} LASTFM.api_secret
 * @property {string} LASTFM.username
 * @property {string} LASTFM.password
 * @property {string} LASTFM.session_key
 */

/**
 * Return the proper private items based on environment variables
 * @type {{settings: Settings, svcAcct: object}}
 */
const stuff = {
  settings: require(process.cwd() + `/private/${process.env.ENV || "prod"}/settings.js`),
  svcAcct: require(process.cwd() +
    `/private/${process.env.ENV || "prod"}/serviceAccountCredentials.json`),
};
module.exports = stuff;
