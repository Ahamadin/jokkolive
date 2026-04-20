// src/config.js
// ─────────────────────────────────────────────────────────────
// Configuration centralisée — lit les variables VITE_ du .env
// Même backend que la plateforme de réunion (reunioncrypto.rtn.sn)
// ─────────────────────────────────────────────────────────────

// ── URLs principales ──────────────────────────────────────────
export const API_BASE_URL    = import.meta.env.VITE_API_BASE       || 'https://backjm.unchk.sn';
export const LIVEKIT_WS_URL  = import.meta.env.VITE_LIVEKIT_WS_URL || 'wss://livekitjm.unchk.sn';
export const LIVEKIT_URL     = import.meta.env.VITE_LIVEKIT_URL    || 'https://livekitjm.unchk.sn';
export const MATRIX_BASE_URL = import.meta.env.VITE_MATRIX_BASE_URL|| 'https://communication.rtn.sn';
export const TOKEN_PATH      = import.meta.env.VITE_TOKEN_PATH     || '/api/livekit/token';
export const DEBUG           = import.meta.env.VITE_DEBUG === 'true';

// ── Log config au démarrage (dev seulement) ───────────────────
if (DEBUG) {
  console.log('[Config] JokkoLive — env chargé:', {
    API_BASE_URL,
    LIVEKIT_WS_URL,
    LIVEKIT_URL,
    TOKEN_PATH,
    DEBUG,
  });
}

// ── Rôles dans un stream ──────────────────────────────────────
export const ROLE = {
  HOST:    'host',     // Hôte : canPublish=true, roomAdmin=true
  SPEAKER: 'speaker',  // Invité sur scène : canPublish=true
  VIEWER:  'viewer',   // Spectateur : canPublish=false
};

// ── Types de messages DataChannel ────────────────────────────
export const MSG = {
  CHAT:          'chat',
  REACTION:      'reaction',
  RAISE_HAND:    'raise_hand',
  LOWER_HAND:    'lower_hand',
  INVITE_STAGE:  'invite_to_stage',
  REMOVE_STAGE:  'remove_from_stage',
  ACCEPT_STAGE:  'accept_stage',
  DECLINE_STAGE: 'decline_stage',
  VIEWER_COUNT:  'viewer_count',
  STREAM_ENDED:  'stream_ended',
};