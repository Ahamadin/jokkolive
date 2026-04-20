// services/recording.service.js
// ✅ Ton fichier original — AUCUNE modification nécessaire ici.
// Le seul bug était dans le controller (conflit de noms à l'import).

const { EgressClient, EncodedFileType } = require("livekit-server-sdk");
const livekitConfig = require("../config/livekit");
const ENV = require("../config/env");

// Client Egress pour l'enregistrement
const egressClient = new EgressClient(
  livekitConfig.url,
  livekitConfig.apiKey,
  livekitConfig.apiSecret
);

// Config MinIO / S3
const S3_CONFIG = {
  accessKey:      ENV.S3_KEY_ID,
  secret:         ENV.S3_KEY_SECRET,
  region:         ENV.S3_REGION,
  endpoint:       ENV.S3_ENDPOINT,
  bucket:         ENV.S3_BUCKET,
  forcePathStyle: true, // ⚠️ OBLIGATOIRE pour MinIO
};

/**
 * Démarrer l'enregistrement composite d'une room et sauvegarder dans MinIO
 * @param {string} roomName
 * @returns {{ egressId, filepath }}
 */
module.exports.startRoomCompositeRecording = async (roomName) => {
  if (!S3_CONFIG.accessKey || !S3_CONFIG.secret || !S3_CONFIG.endpoint || !S3_CONFIG.bucket) {
    throw new Error(
      "Configuration MinIO/S3 incomplète. Vérifiez S3_KEY_ID, S3_KEY_SECRET, S3_ENDPOINT, S3_BUCKET dans .env"
    );
  }

  const timestamp = Date.now();
  const date      = new Date(timestamp).toISOString().split("T")[0];
  const filepath  = `recordings/${date}/${roomName}/${timestamp}.mp4`;

  console.log("[Recording] 🎬 Démarrage enregistrement:", { roomName, filepath });
  console.log("[Recording] 📦 Config MinIO:", {
    endpoint:       S3_CONFIG.endpoint,
    bucket:         S3_CONFIG.bucket,
    region:         S3_CONFIG.region,
    forcePathStyle: S3_CONFIG.forcePathStyle,
  });

  const egress = await egressClient.startRoomCompositeEgress(roomName, {
    layout:    "grid",
    audioOnly: false,
    file: {
      fileType:  EncodedFileType.MP4,
      filepath,
      s3: {
        accessKey:      S3_CONFIG.accessKey,
        secret:         S3_CONFIG.secret,
        region:         S3_CONFIG.region,
        endpoint:       S3_CONFIG.endpoint,
        bucket:         S3_CONFIG.bucket,
        forcePathStyle: S3_CONFIG.forcePathStyle,
      },
    },
  });

  console.log("[Recording] ✅ Enregistrement démarré:", {
    egressId: egress.egressId,
    roomName,
    filepath,
  });

  return { egressId: egress.egressId, filepath };
};

/**
 * Lister les enregistrements actifs d'une room
 * @param {string} roomName
 */
module.exports.listActiveRecordings = async (roomName) => {
  const egresses = await egressClient.listEgress({ roomName });
  return egresses.filter((e) => e.status === 0 || e.status === 1);
};

/**
 * Arrêter un enregistrement spécifique ou tous les actifs de la room
 * @param {string} roomName
 * @param {string|null} egressId
 */
module.exports.stopRecording = async (roomName, egressId = null) => {
  if (egressId) {
    await egressClient.stopEgress(egressId);
    console.log(`[Recording] 🛑 Enregistrement arrêté: ${egressId}`);
    return { stopped: 1, message: "Enregistrement arrêté" };
  }

  const active = await module.exports.listActiveRecordings(roomName);
  if (active.length === 0) {
    return { stopped: 0, message: "Aucun enregistrement actif trouvé" };
  }

  for (const e of active) {
    await egressClient.stopEgress(e.egressId);
    console.log(`[Recording] 🛑 Enregistrement arrêté: ${e.egressId}`);
  }

  return { stopped: active.length, message: `${active.length} enregistrement(s) arrêté(s)` };
};
