/**
 * takes a string and returns a normalized version of it that we use
 * for comparison when trying to search for artst and song titles
 * from youtube and soundcloud
 * @param {string} str
 * @returns {string}
 */
function normalize(str) {
  return (
    str
      // remove accents
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      // remove spaces
      .replace(/\s/g, "")
      // make lowercase
      .toLowerCase()
  );
}

module.exports = { normalize };
