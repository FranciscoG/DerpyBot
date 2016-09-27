'use strict';
// var repo = require(process.cwd()+'/repo');
var settings = require(process.cwd() + '/private/settings.js');
// var usersInfo = require(process.cwd()+'/bot/utilities/users');
var request = require('request');
// var _ = require('underscore');

var flattrApi = {
  'authorize' : 'https://flattr.com/oauth/authorize',
  'token' : 'https://flattr.com/oauth/token',
  'user' : 'https://api.flattr.com/rest/v2/users/:username',
  'flattr' : 'https://api.flattr.com/rest/v2/things/:id/flattr'
};

/*
http://developers.flattr.net/api/

  1. get code using client id and scopes
  2. get access token using code, client id, and client secret

  GET 
  https://flattr.com/oauth/authorize
  ?response_type=code&
  client_id=1234&
  redirect_uri=http://localhost&
  scope=flattr
  
  GET
  https://api.flattr.com/rest/v2/users/:username

 */

function getCode(cb){

  request({
    url: flattrApi.authorize,
    method: 'GET',
    form: {
      'response_type': 'code',
      'client_id' : settings.FLATTR.CLIENT_ID,
      'scope' : 'flattr',
      'redirect_uri': 'http://localhost'
    }
  }, function(error, response, body) {
    if (error) { console.log(error); }
    if (!error && response.statusCode === 200) {
      if (typeof cb !== 'undefined') { cb(body); }
    }
  });

}

function getToken(code, cb) {

  request({
    url: flattrApi.token,
    method: 'POST',
    form: {
      'code': code,
      'grant_type' : 'authorization_code',
      'redirect_uri' : 'http://localhost'
    }
  }, function(error, response, body) {
    if (error) { console.log(error); }
    if (!error && response.statusCode === 200) {
      if (typeof cb !== 'undefined') { cb(body); }
    }
  });

}

module.exports = {
 getCode: getCode,
 getToken: getToken
};