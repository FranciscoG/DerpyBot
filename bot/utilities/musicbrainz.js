const { normalize } = require("./normalize.js");

const MUSICBRAINZ_API = "https://musicbrainz.org/ws/2";

class MusicBrainz {
  /**
   * @param {string} title
   */
  constructor(title) {
    this.title = title.trim();
    this.titleEncoded = encodeURIComponent(this.title);
    this.titleLowerCase = normalize(this.title);
    this.offset = 0;
    this.count = 1;
  }

  async searchRecordings() {
    const response = await fetch(
      `${MUSICBRAINZ_API}/recording?query=${this.titleEncoded}&fmt=json`
    );
    const json = await response.json();
    // console.log(JSON.stringify(json, null, 2));

    for (const recording of json.recordings) {
      if (
        this.titleLowerCase.includes(normalize(recording.title)) &&
        this.titleLowerCase.includes(normalize(recording["artist-credit"][0].name))
      ) {
        return { songTitle: recording.title, artist: recording["artist-credit"][0].name };
      }
    }
  }

  /**
   *
   * @param {string} artistId
   * @returns
   */
  async getArtistRecordings(artistId) {
    const recordingsResponse = await fetch(
      `${MUSICBRAINZ_API}/recording?artist=${artistId}&fmt=json&limit=100&offset=${this.offset}`
    );
    const recordingsJson = await recordingsResponse.json();

    if (!this.count) {
      this.count = recordingsJson["recording-count"];
    }
    return recordingsJson;
  }

  async getArtist() {
    const response = await fetch(`${MUSICBRAINZ_API}/artist?query=${this.titleEncoded}&fmt=json`);
    const json = await response.json();
    let foundArtist;
    for (const artist of json.artists) {
      if (this.titleLowerCase.includes(artist.name.toLowerCase())) {
        foundArtist = artist;
        break;
      }
    }

    if (!foundArtist) {
      return;
    }

    // look in all recordings for a title that matches ours
    while (this.offset < this.count && this.offset < 301) {
      const recordingsJson = await this.getArtistRecordings(foundArtist.id);
      for (const recording of recordingsJson.recordings) {
        if (this.titleLowerCase.includes(recording.title.toLowerCase())) {
          return { songTitle: recording.title, artist: foundArtist.name };
        }
      }
      this.offset += 100;
    }
  }

  async search() {
    // first we try the recordings endpoint and see if we can find a match
    const recording = await this.searchRecordings();
    if (recording) {
      return recording;
    }

    // then we try the artist endpoint and see if we can find a match
    const artist = await this.getArtist();
    if (artist) {
      return artist;
    }
  }
}

module.exports = MusicBrainz;
