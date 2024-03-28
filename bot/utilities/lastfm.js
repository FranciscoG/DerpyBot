"use strict";
const crypto = require("crypto");
const querystring = require("querystring");

const API_BASE = "ws.audioscrobbler.com/2.0";
const LASTFM_API_METHODS = {
  AUTH: {
    GET_MOBILE_SESSION: "auth.getMobileSession",
  },
  ARTIST: {
    GET_INFO: "artist.getInfo",
    GET_SIMILAR: "artist.getSimilar",
    GET_TOP_TRACKS: "artist.getTopTracks",
    GET_TOP_ALBUMS: "artist.getTopAlbums",
    GET_TAGS: "artist.getTags",
    GET_EVENTS: "artist.getEvents",
    GET_IMAGES: "artist.getImages",
    SEARCH: "artist.search",
  },
  ALBUM: {
    GET_INFO: "album.getInfo",
    GET_TAGS: "album.getTags",
    SEARCH: "album.search",
  },
  TRACK: {
    GET_INFO: "track.getInfo",
    GET_SIMILAR: "track.getSimilar",
    GET_TAGS: "track.getTags",
    SEARCH: "track.search",
  },
};

/**
 * @typedef {object} LastFmUrlParams
 * @property {string} method
 * @property {string} [api_key]
 * @property {0 | 1} autocorrect
 * @property {string} username
 * @property {string} artist
 * @property {'json'} format
 * @property {string} [track]
 */

/**
 * @typedef {object} SessionKeyResponse
 * @property {string} [message]
 * @property {number} [error]
 * @property {object} [session]
 * @property {string} session.key
 * @property {string} session.name
 * @property {number} session.subscriber
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
  }

  /**
   *
   * @param {object} opt
   * @param {string} opt.artist
   * @param {string} [opt.track]
   * @param {(data: any) => void} [opt.callback]
   */
  getInfo(opt = {}) {
    if (!opt.artist && typeof opt.callback === "function") {
      opt.callback({
        "@": { status: "error" },
        error: { "#": "Artist not specified." },
      });
      return;
    }

    const queryObject = {
      method: opt.track ? LASTFM_API_METHODS.TRACK.GET_INFO : LASTFM_API_METHODS.ARTIST.GET_INFO,
      api_key: this.api_key,
      autocorrect: 1,
      username: this.username,
      artist: opt.artist,
      format: "json",
    };
    if (opt.track) queryObject.track = opt.track;
    const query = querystring.stringify(queryObject);

    const url = `http://${API_BASE}/?${query}`;
    fetch(url, { headers: { "User-Agent": "DerpyBot" } })
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        if (typeof opt.callback == "function") {
          opt.callback(data);
        }
      })
      .catch((e) => {
        this.logger("error", "LASTFM", "Exception fetching track or artist info: ", e);
      });
  }

  /**
   * For more info on the API:
   * https://www.last.fm/api/mobileauth
   * https://www.last.fm/api/show/auth.getMobileSession
   */
  async getSessionKey() {
    try {
      const sig = [
        "api_key",
        this.api_key,
        "method",
        LASTFM_API_METHODS.AUTH.GET_MOBILE_SESSION,
        "password",
        this.password,
        "username",
        this.username,
        this.api_secret,
      ].join("");
      const api_sig = md5(sig);

      const bodyObj = {
        method: LASTFM_API_METHODS.AUTH.GET_MOBILE_SESSION,
        password: this.password,
        username: this.username,
        api_key: this.api_key,
        api_sig,
      };
      const body = Object.keys(bodyObj)
        .map((key) => `${key}=${bodyObj[key]}`)
        .join("&");

      const url = `https://${API_BASE}/?format=json`;
      const res = await fetch(url, { method: "POST", body, headers: { "User-Agent": "DerpyBot" } });

      /**
       * @type {SessionKeyResponse}
       */
      // @ts-ignore
      const json = await res.json();
      console.log(json);
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

  scrobbleTrack(opt = {}) {
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

  addTrackTags(opt = {}) {
    const options = Object.assign(opt, { method: "track.addTags" });
    this.doScrobble(options);
  }

  doScrobble(options = {}) {
    if (!this.api_secret && typeof options.callback === "function") {
      options.callback({
        success: false,
        error: "API Secret not specified.",
      });
      return;
    }

    if (!this.username && typeof options.callback == "function") {
      options.callback({
        success: false,
        error: "Username not specified.",
      });
      return;
    }

    if (!this.session_key && typeof options.callback == "function") {
      options.callback({
        success: false,
        error: "Password not specified.",
      });
      return;
    }

    options.timestamp = options.timestamp
      ? Math.floor(options.timestamp)
      : Math.floor(now() / 1000);

    var sig =
      "api_key" +
      this.api_key +
      "artist" +
      options.artist +
      "method" +
      options.method +
      "sk" +
      this.session_key +
      (options.tags != null ? "tags" + options.tags : "") +
      "timestamp" +
      options.timestamp +
      "track" +
      options.track +
      this.api_secret;
    var api_sig = md5(sig);

    var post_obj = {
      api_key: this.api_key,
      method: options.method,
      sk: this.session_key,
      api_sig: api_sig,
      timestamp: options.timestamp,
      artist: options.artist,
      track: options.track,
    };

    if (options.tags != null) post_obj.tags = options.tags;
    var post_data = querystring.stringify(post_obj);

    //	console.log("post_data: ", post_data);

    var post_options = {
      host: "ws.audioscrobbler.com",
      port: "80",
      path: "/2.0/",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": post_data.length,
      },
    };

    var post_req = http.request(post_options, function (res) {
      res.setEncoding("utf8");
      res.on("data", function (chunk) {
        //			console.log('Response: ' + chunk);
        var parser = new xml2js.Parser(xml2js.defaults["0.1"]);
        parser.parseString(chunk, function (err, result) {
          try {
            if (result["@"].status == "ok") {
              //						console.log("Track scrobbled (" + options.method + " )");
              if (typeof options.callback == "function") {
                options.callback({
                  success: true,
                });
              }
            } else {
              if (typeof options.callback == "function") {
                options.callback({
                  success: false,
                  error: result.error["#"],
                });
              }
            }
          } catch (e) {
            if (this.debug) console.log("Exception parsing scrobble result: ", e);
          }
        });
      });
    });
    post_req.write(post_data);
    post_req.end();
  }

  getTrackInfo(opt) {
    opt = opt || {};
    if (opt.artist == undefined || (opt.artist == "" && typeof opt.callback == "function")) {
      opt.callback({
        success: false,
        error: "Artist not specified.",
      });
    } else if (opt.track == undefined || (opt.track == "" && typeof opt.callback == "function")) {
      opt.callback({
        success: false,
        error: "Track not specified.",
      });
    } else if (typeof opt.callback == "function") {
      var the_callback = opt.callback;
      this._isTheMethodCaller = true;
      this.getInfo(
        Object.assign(opt, {
          callback: function (result) {
            this._isTheMethodCaller = false;
            if (result["@"].status == "ok") {
              the_callback({
                success: true,
                trackInfo: result.track,
              });
            } else {
              the_callback({
                success: false,
                error: result.error["#"],
              });
            }
          },
        })
      );
    }
  }

  getArtistInfo(opt) {
    opt = opt || {};
    opt.track = "";
    if (opt.artist == undefined || (opt.artist == "" && typeof opt.callback == "function")) {
      opt.callback({
        success: false,
        error: "Artist not specified.",
      });
    } else if (typeof opt.callback == "function") {
      var the_callback = opt.callback;
      this._isTheMethodCaller = true;
      this.getInfo(
        Object.assign(opt, {
          callback: function (result) {
            this._isTheMethodCaller = false;
            if (result["@"].status == "ok") {
              the_callback({
                success: true,
                artistInfo: result.artist,
              });
            } else {
              the_callback({
                success: false,
                error: result.error["#"],
              });
            }
          },
        })
      );
    }
  }

  getTags(opt) {
    var the_callback = opt.callback;
    this._isTheMethodCaller = true;
    this.getInfo(
      Object.assign(opt, {
        callback: function (result) {
          this._isTheMethodCaller = false;
          //			console.log("result: ", result);
          if (typeof the_callback == "function") {
            if (result["@"].status == "ok") {
              var tags =
                opt.track != undefined && opt.track != ""
                  ? result.track.toptags.tag
                  : result.artist.tags.tag;
              if (typeof tags == "object" && !tags.length) tags = [tags];
              var args = {
                success: true,
                tags: tags || [],
                artist:
                  opt.track != undefined && opt.track != ""
                    ? result.track.artist.name
                    : result.artist.name,
              };
              if (opt.track != undefined && opt.track != "") args.track = result.track.name;
              the_callback(args);
            } else {
              the_callback({
                success: false,
                error: result.error["#"],
              });
            }
          }
        },
      })
    );
  }

  getPlays(opt) {
    var the_callback = opt.callback;
    this._isTheMethodCaller = true;
    this.getInfo(
      Object.assign(opt, {
        callback: function (result) {
          this._isTheMethodCaller = false;
          if (typeof the_callback == "function") {
            if (result["@"].status == "ok") {
              var ret = {
                success: true,
                plays:
                  opt.track != undefined && opt.track != ""
                    ? result.track.userplaycount
                    : result.artist.stats.userplaycount,
                artist:
                  opt.track != undefined && opt.track != ""
                    ? result.track.artist.name
                    : result.artist.name,
              };
              if (ret.plays == undefined) ret.plays = 0;
              if (opt.track != undefined && opt.track != "") ret.track = result.track.name;
              the_callback(ret);
            } else {
              the_callback({
                success: false,
                error: result.error["#"],
              });
            }
          }
        },
      })
    );
  }

  getTracks(opt) {
    //	var the_callback = opt.callback;
    var page = opt.page ? opt.page : 1;
    http.get(
      {
        host: "ws.audioscrobbler.com",
        port: 80,
        path:
          "/2.0/?method=user.getartisttracks&page=" +
          page +
          "&api_key=" +
          this.api_key +
          "&autocorrect=1&user=" +
          this.username +
          "&artist=" +
          encodeURIComponent(opt.artist),
      },
      function (res) {
        var body = "";
        res.on("data", function (chunk) {
          body += chunk;
        });
        res.on("end", function () {
          var parser = new xml2js.Parser(xml2js.defaults["0.1"]);
          parser.parseString(body, function (err, result) {
            if (typeof opt.callback == "function") {
              opt.callback(result);
            }
          });
        });
      }
    );
  }

  getAllTracks(opt) {
    var lastfm = this;
    var the_callback = opt.callback;
    var tracks = [];
    opt.callback = function (result) {
      if (result["@"].status == "failed") {
        the_callback({
          success: false,
          reason: result.error["#"],
        });
      } else {
        var numPages = result.artisttracks["@"].totalPages;
        for (var i = 0; i < result.artisttracks.track.length; i++) {
          if (tracks.indexOf(result.artisttracks.track[i].name) < 0)
            tracks.push(result.artisttracks.track[i].name);
        }
        if (result.artisttracks["@"].page < numPages) {
          opt.page++;
          lastfm.getTracks(opt);
        } else {
          the_callback({ success: true, artist: result.artisttracks["@"].artist, tracks: tracks });
        }
      }
    };
    opt.page = 1;
    this.getTracks(opt);
  }

  getTopArtists(opt) {
    var lastfm = this;
    var the_callback = opt.callback;
    delete opt.callback;
    lastfm.doGet({
      method: "user.gettopartists",
      args: opt,
      callback: function (result) {
        if (typeof the_callback === "function") {
          if (result["@"].status == "ok") {
            the_callback({
              success: true,
              topArtists: result.topartists.artist,
            });
          } else {
            the_callback({
              success: false,
              error: result.error["#"],
            });
          }
        }
      },
    });
  }

  getSimilarArtists(opt) {
    var lastfm = this;
    var the_callback = opt.callback;
    delete opt.callback;
    lastfm.doGet({
      method: "artist.getsimilar",
      args: opt,
      callback: function (result) {
        if (typeof the_callback === "function") {
          if (result["@"].status == "ok") {
            the_callback({
              success: true,
              similarArtists: result.similarartists.artist,
            });
          } else {
            the_callback({
              success: false,
              error: result.error["#"],
            });
          }
        }
      },
    });
  }

  doGet(opt) {
    var lastfm = this;
    var the_callback = opt.callback;
    opt.args.api_key = this.api_key;
    opt.args.method = opt.method;
    var path = "/2.0/?" + querystring.stringify(opt.args);
    http.get(
      {
        host: "ws.audioscrobbler.com",
        port: 80,
        path: path,
      },
      function (res) {
        var body = "";
        res.on("data", function (chunk) {
          body += chunk;
        });
        res.on("end", function () {
          var parser = new xml2js.Parser(xml2js.defaults["0.1"]);
          parser.parseString(body, function (err, result) {
            if (typeof the_callback == "function") {
              the_callback(result);
            }
          });
        });
      }
    );
  }
}

function now() {
  return new Date().getTime();
}

/**
 *
 * @param {string} str
 * @returns
 */
function md5(str) {
  return crypto.createHash("md5").update(str, "utf8").digest("hex");
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
