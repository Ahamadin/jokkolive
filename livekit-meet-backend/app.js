// app.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const ENV = require("./config/env");

const meetRoutes = require("./routes/meet.routes");
const recordingRoutes = require("./routes/recording.routes");

const app = express();

// ─────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: ENV.ALLOWED_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─────────────────────────────────────────────────────────────
// Middleware globaux
// ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(morgan("dev"));

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────
app.use("/api/meet", meetRoutes);
app.use("/api/recording", recordingRoutes);

// ─────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────
app.get("/health", (_, res) => {
  res.json({
    status: "ok",
    service: "livekit-meet-backend",
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────
// 404
// ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} introuvable` });
});

// ─────────────────────────────────────────────────────────────
// Erreur globale
// ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[App] Erreur non gérée:", err.message);
  res.status(500).json({ error: "Erreur serveur interne" });
});

module.exports = app;
