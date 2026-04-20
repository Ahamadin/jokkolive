// config/env.js
const dotenv = require("dotenv");
dotenv.config();

// Validation des variables critiques
const required = ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "LIVEKIT_URL"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Variables d'environnement manquantes: ${missing.join(", ")}`);
  process.exit(1);
}

module.exports = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || "development",

  // LiveKit
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
  LIVEKIT_URL: process.env.LIVEKIT_URL,

  // MinIO / S3
  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_BUCKET: process.env.S3_BUCKET || "livekit-recordings",
  S3_KEY_ID: process.env.S3_KEY_ID,
  S3_KEY_SECRET: process.env.S3_KEY_SECRET,
  S3_REGION: process.env.S3_REGION || "us-east-1",

  // CORS
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:5173", "http://localhost:3000"],
};
