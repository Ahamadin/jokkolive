// routes/meet.routes.js
const express = require("express");
const { authMeet } = require("../middlewares/authMeet");
const {
  createMeeting,
  joinMeeting,
  getMeetingInfo,
  closeMeeting,
} = require("../controllers/meet.controller");

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// POST /api/meet/create
// Créer une nouvelle réunion
// Body: { displayName, roomName? }
//   roomName optionnel : si absent → code auto généré (abc-defg-hij)
// ─────────────────────────────────────────────────────────────
router.post("/create", authMeet, createMeeting);

// ─────────────────────────────────────────────────────────────
// POST /api/meet/join
// Rejoindre une réunion existante
// Body: { displayName, roomName }
// ─────────────────────────────────────────────────────────────
router.post("/join", authMeet, joinMeeting);

// ─────────────────────────────────────────────────────────────
// GET /api/meet/:roomName/info
// Informations sur une réunion (participants, statut)
// Pas d'auth requis → utilisé pour l'écran d'accueil avant de rejoindre
// ─────────────────────────────────────────────────────────────
router.get("/:roomName/info", getMeetingInfo);

// ─────────────────────────────────────────────────────────────
// DELETE /api/meet/:roomName
// Fermer une réunion (hôte uniquement — contrôlé côté frontend)
// ─────────────────────────────────────────────────────────────
router.delete("/:roomName", closeMeeting);

module.exports = router;
