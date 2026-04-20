// services/livekit.service.js
const { AccessToken, RoomServiceClient } = require("livekit-server-sdk");
const livekitConfig = require("../config/livekit");

const roomService = new RoomServiceClient(
  livekitConfig.url,
  livekitConfig.apiKey,
  livekitConfig.apiSecret
);

/**
 * Créer un token JWT LiveKit
 * ✅ On ajoute metadata: { role } — signé par le serveur, impossible à falsifier côté client
 */
module.exports.createLiveKitToken = async ({ displayName, roomName, isHost = false }) => {
  const at = new AccessToken(
    livekitConfig.apiKey,
    livekitConfig.apiSecret,
    {
      identity: displayName,
      name:     displayName,
      ttl:      "4h",
      // ✅ Rôle encodé dans le token JWT — lu par le frontend via localParticipant.metadata
      metadata: JSON.stringify({ role: isHost ? "host" : "participant" }),
    }
  );

  at.addGrant({
    room:           roomName,
    roomJoin:       true,
    canPublish:     true,
    canSubscribe:   true,
    canPublishData: true,
    roomAdmin:      isHost,
    roomCreate:     isHost,
  });

  return await at.toJwt();
};

/**
 * Créer la room sur LiveKit (ou confirmer qu'elle existe)
 */
module.exports.ensureRoom = async (roomName) => {
  try {
    const room = await roomService.createRoom({
      name:            roomName,
      emptyTimeout:    300,
      maxParticipants: 50,
    });
    console.log(`[Room] ✅ Room créée/confirmée: ${roomName}`);
    return room;
  } catch (err) {
    if (err.message?.includes("already exists") || err.code === 6) {
      console.log(`[Room] ℹ️ Room déjà existante: ${roomName}`);
      return null;
    }
    throw err;
  }
};

/**
 * Lister les participants actifs d'une room
 */
module.exports.getRoomParticipants = async (roomName) => {
  try {
    const participants = await roomService.listParticipants(roomName);
    return participants.map((p) => ({
      identity:     p.identity,
      name:         p.name,
      joinedAt:     p.joinedAt,
      isPublishing: p.tracks?.length > 0,
    }));
  } catch {
    return [];
  }
};

/**
 * Supprimer une room LiveKit
 */
module.exports.deleteRoom = async (roomName) => {
  await roomService.deleteRoom(roomName);
  console.log(`[Room] 🗑️ Room supprimée: ${roomName}`);
};
