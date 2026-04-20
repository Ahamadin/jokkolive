// controllers/recording.controller.js
//
// ⚠️  CAUSE DU CRASH "argument handler must be a function" :
//     Le controller importait { stopRecording } depuis le service ET exportait
//     module.exports.stopRecording → conflit de noms, Node passait undefined à Express.
//
// ✅  FIX : importer le service entier sous "recordingService" (pas de destructuring)

const recordingService = require("../services/recording.service");

// ─────────────────────────────────────────────────────────────
// POST /api/recording/start
// ─────────────────────────────────────────────────────────────
module.exports.startRecording = async (req, res) => {
  try {
    const { displayName, roomName } = req.meetUser;
    if (!roomName) return res.status(400).json({ error: "roomName requis" });

    console.log(`[Recording] 🎬 Démarrage - Room: "${roomName}" par "${displayName}"`);
    const result = await recordingService.startRoomCompositeRecording(roomName);

    return res.json({
      success:  true,
      egressId: result.egressId,
      filepath: result.filepath,
      message:  "Enregistrement démarré — sauvegarde dans MinIO",
    });
  } catch (error) {
    console.error("[Recording] ❌ Erreur démarrage:", error.message);

    // Erreur egress hors ligne
    if (error.message?.includes("no response from servers")) {
      return res.status(500).json({
        error: "Le service egress ne répond pas — voir instructions ci-dessous",
        detail: error.message,
        fix: "Lancer: cd /home/livekit-egress && ./livekit-egress --config egress.yml",
      });
    }
    return res.status(500).json({ error: error.message || "Erreur serveur" });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/recording/stop
// ─────────────────────────────────────────────────────────────
module.exports.stopRecording = async (req, res) => {
  try {
    const { displayName, roomName } = req.meetUser;
    const { egressId } = req.body;
    if (!roomName) return res.status(400).json({ error: "roomName requis" });

    console.log(
      `[Recording] 🛑 Arrêt - Room: "${roomName}" par "${displayName}"` +
      (egressId ? ` (egressId: ${egressId})` : "")
    );
    const result = await recordingService.stopRecording(roomName, egressId || null);

    return res.json({ success: true, stopped: result.stopped, message: result.message });
  } catch (error) {
    console.error("[Recording] ❌ Erreur arrêt:", error.message);
    return res.status(500).json({ error: error.message || "Erreur serveur" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/recording/active/:roomName
// ─────────────────────────────────────────────────────────────
module.exports.getActiveRecordings = async (req, res) => {
  try {
    const roomName = req.params.roomName?.toLowerCase().trim();
    if (!roomName) return res.status(400).json({ error: "roomName requis" });

    const active = await recordingService.listActiveRecordings(roomName);
    return res.json({
      roomName,
      count: active.length,
      recordings: active.map((e) => ({
        egressId:  e.egressId,
        status:    e.status === 0 ? "STARTING" : "ACTIVE",
        startedAt: e.startedAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
