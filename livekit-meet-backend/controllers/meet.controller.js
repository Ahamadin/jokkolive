// controllers/meet.controller.js
const { nanoid } = require("nanoid");
const {
  createLiveKitToken,
  ensureRoom,
  getRoomParticipants,
  deleteRoom,
} = require("../services/livekit.service");

// ─────────────────────────────────────────────────────────────
// Générer un code de réunion unique style Google Meet : abc-defg-hij
// ─────────────────────────────────────────────────────────────
function generateMeetCode() {
  const id = nanoid(10).toLowerCase().replace(/[^a-z0-9]/g, "a");
  return `${id.slice(0, 3)}-${id.slice(3, 7)}-${id.slice(7, 10)}`;
}

// ─────────────────────────────────────────────────────────────
// POST /api/meet/create
// Créer une nouvelle réunion (hôte)
// Body: { displayName, roomName? }
//   - Si roomName absent ou "auto" → code auto généré
// ─────────────────────────────────────────────────────────────
module.exports.createMeeting = async (req, res) => {
  try {
    const { displayName } = req.meetUser;
    let { roomName } = req.meetUser;

    // Générer un code unique si pas de roomName fourni
    if (!roomName || roomName === "auto") {
      roomName = generateMeetCode();
    }

    // Créer la room sur LiveKit
    await ensureRoom(roomName);

    // Générer le token hôte
    const token = await createLiveKitToken({
      displayName,
      roomName,
      isHost: true,
    });

    console.log(`[Meet] ✅ Réunion créée: "${roomName}" par "${displayName}"`);

    return res.status(201).json({
      token,
      roomName,
      displayName,
      role: "host",
      joinUrl: `/meet/${roomName}`,
      message: "Réunion créée avec succès",
    });
  } catch (error) {
    console.error("[Meet] ❌ Erreur création:", error.message);
    return res.status(500).json({ error: error.message || "Erreur serveur" });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/meet/join
// Rejoindre une réunion existante (invité)
// Body: { displayName, roomName }
// ─────────────────────────────────────────────────────────────
module.exports.joinMeeting = async (req, res) => {
  try {
    const { displayName, roomName } = req.meetUser;

    if (!roomName) {
      return res.status(400).json({ error: "roomName requis pour rejoindre une réunion" });
    }

    // Récupérer les participants actuels
    const participants = await getRoomParticipants(roomName);

    // Créer la room si elle n'existe pas encore (l'hôte peut arriver en premier)
    await ensureRoom(roomName);

    // Générer le token participant
    const token = await createLiveKitToken({
      displayName,
      roomName,
      isHost: false,
    });

    console.log(
      `[Meet] 👤 "${displayName}" rejoint "${roomName}" (${participants.length} participant(s) présent(s))`
    );

    return res.json({
      token,
      roomName,
      displayName,
      role: "participant",
      participantCount: participants.length,
      participants: participants.map((p) => p.name || p.identity),
      joinUrl: `/meet/${roomName}`,
    });
  } catch (error) {
    console.error("[Meet] ❌ Erreur join:", error.message);
    return res.status(500).json({ error: error.message || "Erreur serveur" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/meet/:roomName/info
// Informations sur une réunion (participants, active ?)
// ─────────────────────────────────────────────────────────────
module.exports.getMeetingInfo = async (req, res) => {
  try {
    const roomName = req.params.roomName?.toLowerCase().trim();

    if (!roomName) {
      return res.status(400).json({ error: "roomName requis" });
    }

    const participants = await getRoomParticipants(roomName);

    return res.json({
      roomName,
      active: participants.length > 0,
      participantCount: participants.length,
      participants: participants.map((p) => ({
        name: p.name || p.identity,
        joinedAt: p.joinedAt,
        isPublishing: p.isPublishing,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/meet/:roomName
// Fermer une réunion (supprimer la room LiveKit)
// Body: { displayName } — seul l'hôte devrait appeler ça (contrôle côté frontend)
// ─────────────────────────────────────────────────────────────
module.exports.closeMeeting = async (req, res) => {
  try {
    const roomName = req.params.roomName?.toLowerCase().trim();

    if (!roomName) {
      return res.status(400).json({ error: "roomName requis" });
    }

    await deleteRoom(roomName);

    console.log(`[Meet] 🗑️ Réunion fermée: "${roomName}"`);

    return res.json({
      success: true,
      message: `Réunion "${roomName}" fermée`,
    });
  } catch (error) {
    console.error("[Meet] ❌ Erreur fermeture:", error.message);
    return res.status(500).json({ error: error.message });
  }
};
