// routes/recording.routes.js
const express = require("express");
const { authMeet } = require("../middlewares/authMeet");
const {
  startRecording,
  stopRecording,
  getActiveRecordings,
} = require("../controllers/recording.controller");

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// POST /api/recording/start
// Démarrer l'enregistrement d'une room
// Body: { displayName, roomName }
// ─────────────────────────────────────────────────────────────
router.post("/start", authMeet, startRecording);

// ─────────────────────────────────────────────────────────────
// POST /api/recording/stop
// Arrêter l'enregistrement
// Body: { displayName, roomName, egressId? }
// ─────────────────────────────────────────────────────────────
router.post("/stop", authMeet, stopRecording);

// ─────────────────────────────────────────────────────────────
// GET /api/recording/active/:roomName
// Enregistrements actifs d'une room
// ─────────────────────────────────────────────────────────────
router.get("/active/:roomName", getActiveRecordings);

module.exports = router;
