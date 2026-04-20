// config/livekit.js
const ENV = require("./env");

module.exports = {
  apiKey: ENV.LIVEKIT_API_KEY,
  apiSecret: ENV.LIVEKIT_API_SECRET,
  url: ENV.LIVEKIT_URL,
};
