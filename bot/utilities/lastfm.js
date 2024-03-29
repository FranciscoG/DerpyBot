"use strict";
const crypto = require("crypto");
const querystring = require("querystring");

const API_BASE = "ws.audioscrobbler.com/2.0";

/**
 * @typedef {object} BaseGetUrlParams
 * @property {string} method
 * @property {string} [api_key]
 * @property {0 | 1} autocorrect
 * @property {string} username
 * @property {'json'} format
 */

/**
 * @typedef {object} GetInfoParams
 * @property {string} artist
 * @property {string} [track]
 */

/**
 * @typedef {object} ErrorResponse
 * @property {string} [message]
 * @property {number} [error]
 */

/**
 * @typedef {object} SessionKeyResponse
 * @property {object} [session]
 * @property {string} session.key
 * @property {string} session.name
 * @property {number} session.subscriber
 */

/**
 * @typedef {object} LastFmTrackScrobble
 * see https://www.last.fm/api/show/track.scrobble for fulll list of params
 * @property {string} artist
 * @property {string} track
 * @property {number} timestamp The time the track started playing, in UNIX timestamp format (integer number of seconds since 00:00:00, January 1st 1970 UTC). This must be in the UTC time zone.
 * @property {string} [album]
 */

class LastFm {
  /**
   *
   * @param {object} options
   * @param {string} options.api_key
   * @param {string} options.api_secret
   * @param {string} options.username
   * @param {string} options.password
   * @param {string} [options.authToken]
   * @param {string} [options.session_key]
   */
  constructor(options, logger = console.log) {
    this.api_key = options.api_key;
    this.api_secret = options.api_secret;
    this.username = options.username;
    this.password = options.password;
    this.authToken = options.authToken;
    this.session_key = options.session_key;
    this.logger = logger;
    this.validateOptions();
  }

  validateOptions() {
    const errors = [];
    if (!this.api_secret) {
      errors.push("api_secret");
    }

    if (!this.username) {
      errors.push("username");
    }

    if (!this.password) {
      errors.push("password");
    }

    if (!this.api_key) {
      errors.push("api_key");
    }

    if (errors.length) {
      const message = "Missing required options: " + errors.join(", ");
      this.logger("error", "LASTFM", message);
      throw new Error(message);
    }
  }

  /**
   *
   * @param {string} url
   * @param {RequestInit} options
   * @returns
   */
  async doFetch(url, options = {}) {
    options.headers = options.headers || {};
    options.headers["User-Agent"] = "ChilloutMixer Bot";
    const res = await fetch(url, options);
    const json = await res.json();
    return json;
  }

  /**
   *
   * @param {object} opts
   * @param {string} opts.method
   * @param {string} opts.artist
   * @param {string} [opts.track]
   * @returns
   */
  async doGet(opts) {
    /**
     * @type {BaseGetUrlParams & GetInfoParams}
     */
    const queryObject = {
      ...opts,
      autocorrect: 1,
      username: this.username,
      api_key: this.api_key,
      format: "json",
    };

    const query = querystring.stringify(queryObject);
    const url = `http://${API_BASE}/?${query}`;

    try {
      const json = await this.doFetch(url);
      return json;
    } catch (e) {
      this.logger("error", "LASTFM", `Exception fetching ${opts.method}`, e);
      return {
        error: e instanceof Error ? e.message : `Exception fetching ${opts.method}`,
      };
    }
  }

  /**
   * For more info on the API:
   * https://www.last.fm/api/mobileauth
   * https://www.last.fm/api/show/auth.getMobileSession
   */
  async getSessionKey() {
    try {
      const api_sig = this.makeSignature("auth.getMobileSession");

      const bodyObj = {
        method: "auth.getMobileSession",
        password: this.password,
        username: this.username,
        api_key: this.api_key,
        api_sig,
      };
      const body = stringifyBody(bodyObj);

      const url = `https://${API_BASE}/?format=json`;

      /**
       * @type {SessionKeyResponse | ErrorResponse}
       */
      // @ts-ignore
      const json = await this.doFetch(url, { method: "POST", body });
      if (json?.session?.key) {
        this.session_key = json.session.key;
        return {
          success: true,
          session_key: json.session.key,
        };
      }

      if (json?.error && json?.message) {
        throw new Error(`Lastfm error code ${json.error}: ${json.message}`);
      }

      throw new Error("Session key not found in response.");
    } catch (e) {
      this.logger("error", "LASTFM", "Exception getting session key: ", e);
      return {
        success: false,
        error: e instanceof Error ? e.message : "",
      };
    }
  }

  /**
   * https://www.last.fm/api/show/track.scrobble
   * @param {LastFmTrackScrobble} opt
   */
  scrobbleTrack(opt) {
    const options = Object.assign(opt, { method: "track.scrobble" });
    this.doScrobble(options);
  }

  loveTrack(opt = {}) {
    const options = Object.assign(opt, { method: "track.love" });
    this.doScrobble(options);
  }

  unloveTrack(opt = {}) {
    const options = Object.assign(opt, { method: "track.unlove" });
    this.doScrobble(options);
  }

  scrobbleNowPlayingTrack(opt = {}) {
    const options = Object.assign(opt, { method: "track.updateNowPlaying" });
    this.doScrobble(options);
  }

  /**
   * Creates an API signature based on the rules outlined here:
   * https://www.last.fm/api/mobileauth#_4-sign-your-calls
   *
   * @param {string} method
   */
  makeSignature(method) {
    const sig = [
      "api_key",
      this.api_key,
      "method",
      method,
      "password",
      this.password,
      "username",
      this.username,
      this.api_secret,
    ].join("");
    const api_sig = md5(sig);
    return api_sig;
  }

  /**
   *
   * @param {LastFmTrackScrobble & { method: string }} options
   */
  async doScrobble(options) {
    try {
      options.timestamp = options.timestamp
        ? Math.floor(options.timestamp)
        : Math.floor(now() / 1000);

      const api_sig = this.makeSignature(options.method);

      // var sig =
      //   "api_key" +
      //   this.api_key +
      //   "artist" +
      //   options.artist +
      //   "method" +
      //   options.method +
      //   "sk" +
      //   this.session_key +
      //   (options.tags != null ? "tags" + options.tags : "") +
      //   "timestamp" +
      //   options.timestamp +
      //   "track" +
      //   options.track +
      //   this.api_secret;
      // var api_sig = md5(sig);

      const bodyObj = {
        ...options,
        sk: this.session_key,
        api_key: this.api_key,
        api_sig,
      };

      const body = querystring.stringify(bodyObj);

      const url = `https://${API_BASE}/?format=json`;

      /**
       * @type {ErrorResponse}
       */
      // @ts-ignore
      const json = await this.doFetch(url, {
        method: "POST",
        body,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": body.length.toString(),
        },
      });

      if (!json?.error) {
        return {
          success: true,
        };
      }

      return {
        success: false,
        error: json.message,
        errorCode: json.error,
      };
    } catch (e) {
      this.logger("error", "LASTFM", `Exception during ${options.method}`, e);
      return {
        success: false,
        error: e instanceof Error ? e.message : `Exception during ${options.method}`,
      };
    }
  }

  /**
   * https://www.last.fm/api/show/track.getInfo
   * @param {object} opt
   * @param {string} opt.artist
   * @param {string} opt.track
   */
  async getTrackInfo(opt) {
    if (!opt.artist || !opt.track) {
      return {
        error: "Artist and track are required.",
      };
    }

    const result = await this.doGet({ ...opt, method: "track.getInfo" });
    if (!result?.error) {
      return {
        success: true,
        trackInfo: result.track,
      };
    }

    return {
      success: false,
      error: result.error,
    };
  }

  /**
   * https://www.last.fm/api/show/artist.getInfo
   * @param {object} opt
   * @param {string} opt.artist
   */
  async getArtistInfo(opt) {
    if (!opt.artist) {
      return {
        error: "Artist is required.",
      };
    }
    const result = await this.doGet({ ...opt, method: "artist.getInfo" });
    if (!result?.error) {
      return {
        success: true,
        trackInfo: result.artist,
      };
    }

    return {
      success: false,
      error: result.error,
    };
  }

  /**
   * https://www.last.fm/api/show/artist.getTags
   * https://www.last.fm/api/show/track.getTags
   *
   * @param {object} opt
   * @param {string} opt.artist
   * @param {string} [opt.track]
   */
  async getTags(opt) {
    if (!opt.artist) {
      return {
        error: "Artist is required.",
      };
    }

    const method = opt.track ? "track.getTags" : "artist.getTags";
    const result = await this.doGet({ ...opt, method });
    if (!result?.error) {
      return {
        success: true,
        tags: result.tags,
      };
    }

    return {
      success: false,
      error: result.error,
    };
  }

  /**
   * https://www.last.fm/api/show/artist.getInfo
   * There is no separete method for getting the artist's play count.
   * @param {object} opt
   * @param {string} opt.artist
   * @param {string} [opt.track]
   */
  async getPlays(opt) {
    if (!opt.artist) {
      return {
        error: "Artist is required.",
      };
    }

    const method = opt.track ? "track.getInfo" : "artist.getInfo";
    const result = await this.doGet({ ...opt, method });
    if (!result?.error) {
      return {
        success: true,
        plays: opt.track ? result.track.userplaycount : result.artist.stats.userplaycount,
        artist: opt.track ? result.track.artist.name : result.artist.name,
        track: opt.track ? result.track.name : null,
      };
    }

    return {
      success: false,
      error: result.error,
    };
  }

  /**
   *
   * @param {object} opt
   * @param {string} opt.user
   * @param {'overall' | '7day' | '1month' | '3month' | '6month' | '12month'} [opt.period]
   * @param {number} [opt.limit] defaults to 50 if not provided
   * @param {number} [opt.page] defaults to 1 if not provided
   */
  async getTopArtists(opt) {
    if (!opt.user) {
      return {
        error: "User is required.",
      };
    }

    const queryObject = {
      ...opt,
      method: "user.getTopArtists",
      api_key: this.api_key,
      format: "json",
    };

    const query = querystring.stringify(queryObject);
    const url = `http://${API_BASE}/?${query}`;

    try {
      const json = await this.doFetch(url);
      if (!json.error) {
        return {
          success: true,
          topArtists: json.topartists.artist,
        };
      }
      return {
        success: false,
        error: json.error,
      };
    } catch (e) {
      this.logger("error", "LASTFM", `Exception fetching ${queryObject.method}`, e);
      return {
        error: e instanceof Error ? e.message : `Exception fetching ${queryObject.method}`,
      };
    }
  }

  /**
   * https://www.last.fm/api/show/artist.getSimilar
   * @param {object} opt
   * @param {string} opt.artist
   * @param {number} [opt.limit]
   */
  async getSimilarArtists(opt) {
    if (!opt.artist) {
      return {
        error: "Artist is required.",
      };
    }

    const result = await this.doGet({ ...opt, method: "artist.getSimilar" });
    if (!result?.error) {
      return {
        success: true,
        similarArtists: result.similarartists.artist,
      };
    }

    return {
      success: false,
      error: result.error,
    };
  }
}

function now() {
  return new Date().getTime();
}

/**
 *
 * @param {string} str
 * @returns {string}
 */
function md5(str) {
  return crypto.createHash("md5").update(str, "utf8").digest("hex");
}

/**
 * Converts an object to a query string for a POST body. The difference here
 * is that we don't encode the values.
 * @param {Record<string, string|number|boolean|undefined>} bodyObj
 */
function stringifyBody(bodyObj) {
  return Object.keys(bodyObj)
    .reduce((arr, key) => {
      if (bodyObj[key]) {
        arr.push(`${key}=${bodyObj[key]}`);
      }
      return arr;
    }, [])
    .join("&");
}

if (require.main === module) {
  /**
   * The following is not required but is useful for getting the session key.
   * The LastFm class will get the session key if it's not provided.
   *
   * You can get the session key manually by running this script in the command line.
   * From the root of this repository, run:
   * ENV=test node bot/utilities/lastfm.js
   *     ^^^^ or 'prod' for production
   * If successful, you'll see a JSON object with the session key.
   * Copy that key and paste it in the private/{ENV}/settings.js file in the LASTFM.api_session_key field.
   */
  const { settings } = require(process.cwd() + "/private/get");
  const lastfm = new LastFm({
    ...settings.LASTFM,
  });

  lastfm.getSessionKey();
}

module.exports = { LastFm };
