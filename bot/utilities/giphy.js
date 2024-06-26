"use strict";
// modified from this source: https://github.com/ShMcK/API-Demos/tree/master/demo-ng/packages/giphy

const ROOT_API = "http://api.giphy.com/v1/gifs/";

const Giphy = {};

const defaults = {
  API_KEY: "dc6zaTOxFJmzC",
  size: "original", // {string} [fixed, downsized, original]
  limit: 15,
  rating: "pg-13", // {string} [y, g, pg, pg-13, r]
  random: true,
};

Giphy.options = Object.assign({}, defaults);

/**
 *
 * @param {string[]} list
 * @returns {string}
 */
const getRandom = function (list) {
  return list[Math.floor(Math.random() * list.length)];
};

/**
 *
 * @param {{image_original_url: string;fixed_height_small_url: string; fixed_height_downsampled_url: string;}} data
 * @returns {string}
 */
const reformatRandomImage = function (data) {
  var url = null;
  switch (Giphy.options.size) {
    case "original":
      url = data.image_original_url;
      break;
    case "downsized":
      url = data.fixed_height_small_url;
      break;
    case "fixed":
      url = data.fixed_height_downsampled_url;
      break;
    default:
      throw new Error("Not a valid option size for images");
  }
  return url;
};

/**
 * @param {string} query
 * @returns {string}
 */
const buildAPI = function (query) {
  var apiPath = ROOT_API;

  if (Giphy.options.random) {
    apiPath += "random";
    apiPath += "?tag=" + query.replace(/ /g, "+");
  } else {
    apiPath += "search";
    apiPath += "?q=" + query.replace(/ /g, "+");
    apiPath += "&limit=" + Giphy.options.limit;
  }
  apiPath += "&fmt=json";
  apiPath += "&rating=" + Giphy.options.rating;
  apiPath += "&api_key=" + Giphy.options.API_KEY;
  return apiPath;
};

/**
 *
 * @param {string} query
 */
async function apiCall(query) {
  const apiPath = buildAPI(query);

  const res = await fetch(apiPath)
  if (!res.ok) throw new Error(res.status.toString());
  const json = await res.json();
  if (!Giphy.options.random) {
    return getRandom(json.data).images[Giphy.options.size];
  } else {
    return reformatRandomImage(json.data);
  }
}

/*
  random:  bool
  rating : {string} [y, g, pg, pg-13, r]
  limit : number
  size : {string} [fixed, downsized, original] 
 */

const getGif = function (options, query) {
  if (options && typeof options === "object") {
    Giphy.options = Object.assign({}, Giphy.options, options);
  }

  return apiCall(query);
};

module.exports = {
  getGif,
  getRandom,
};
