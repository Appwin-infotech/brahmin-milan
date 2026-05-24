// constants.js
const BASE_URL =
  process.env.MODE === "Development"
    ? process.env.LOCAL_BASE_URL
    : process.env.LIVE_BASE_URL;

module.exports = { BASE_URL };
