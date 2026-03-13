'use strict';
/*
  Firebase diagnostic script
  Checks song_stats node size and inspects firstplay data.

  Run from the project root with:
    node inspectDb.js

  Output:
    - Total number of unique tracks in song_stats
    - Memory estimate for a local cache
    - Sample of 10 entries showing firstplay/lastplay data
    - Breakdown of firstplay users to help diagnose incorrect firstplay attribution
*/

const _private = require(process.cwd() + '/private/get');
const svcAcct = _private.svcAcct;
const settings = _private.settings;
const admin = require('firebase-admin');

var BASEURL = settings.FIREBASE.BASEURL;

admin.initializeApp({
  credential: admin.credential.cert(svcAcct),
  databaseURL: BASEURL
});

var db = admin.database();

console.log('Connecting to Firebase...');
console.log('Database URL:', BASEURL);
console.log('');

db.ref('song_stats').once('value')
  .then(function(snapshot) {
    var data = snapshot.val();

    if (!data) {
      console.log('No song_stats data found.');
      process.exit(0);
    }

    var keys = Object.keys(data);
    var count = keys.length;

    // Estimate memory usage
    var jsonSize = JSON.stringify(data).length;
    var jsonSizeKB = Math.round(jsonSize / 1024);
    var jsonSizeMB = (jsonSize / (1024 * 1024)).toFixed(2);
    var estimatedMemoryMB = (jsonSize * 2 / (1024 * 1024)).toFixed(2); // JS objects ~2x raw JSON

    console.log('=== song_stats summary ===');
    console.log('Unique tracks:       ', count);
    console.log('Raw JSON size:       ', jsonSizeKB + ' KB (' + jsonSizeMB + ' MB)');
    console.log('Est. memory usage:   ', estimatedMemoryMB + ' MB');
    console.log('');

    // Tally firstplay users to spot any systematic misattribution
    var firstplayUsers = {};
    var firstplayDates = {};
    var missingFirstplay = 0;

    keys.forEach(function(fkid) {
      var entry = data[fkid];
      if (!entry.firstplay || !entry.firstplay.user) {
        missingFirstplay++;
        return;
      }
      var user = entry.firstplay.user;
      var when = entry.firstplay.when;

      firstplayUsers[user] = (firstplayUsers[user] || 0) + 1;

      // Bucket by year-month
      if (when) {
        var d = new Date(when);
        var bucket = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        firstplayDates[bucket] = (firstplayDates[bucket] || 0) + 1;
      }
    });

    // Sort users by count descending
    var sortedUsers = Object.keys(firstplayUsers).sort(function(a, b) {
      return firstplayUsers[b] - firstplayUsers[a];
    });

    console.log('=== firstplay user breakdown (top 10) ===');
    sortedUsers.slice(0, 1000).forEach(function(user) {
      console.log('  ' + user + ':', firstplayUsers[user], 'tracks');
    });
    if (missingFirstplay > 0) {
      console.log('  (missing firstplay data):', missingFirstplay, 'tracks');
    }
    console.log('');

    // Sort dates and show distribution
    var sortedDates = Object.keys(firstplayDates).sort();
    console.log('=== firstplay date distribution ===');
    sortedDates.forEach(function(bucket) {
      console.log('  ' + bucket + ':', firstplayDates[bucket], 'tracks');
    });
    console.log('');

    // Show 10 sample entries
    console.log('=== sample entries (first 10) ===');
    keys.slice(0, 1000).forEach(function(fkid) {
      var entry = data[fkid];
      var fp = entry.firstplay || {};
      var lp = entry.lastplay || {};
      var fpWhen = fp.when ? new Date(fp.when).toISOString() : 'unknown';
      var lpWhen = lp.when ? new Date(lp.when).toISOString() : 'unknown';
      console.log('');
      console.log('  Track:      ', entry.name || fkid);
      console.log('  Plays:      ', entry.plays || 0);
      console.log('  First play: ', fpWhen, 'by', fp.user || 'unknown');
      console.log('  Last play:  ', lpWhen, 'by', lp.user || 'unknown');
    });

    process.exit(0);
  })
  .catch(function(err) {
    console.error('Error reading Firebase:', err.message);
    process.exit(1);
  });
