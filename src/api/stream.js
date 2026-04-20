// src/api/stream.js
// ─────────────────────────────────────────────────────────────
// Appels API vers le backend existant (port 1000)
// Routes à ajouter côté backend : /api/stream/*
// ─────────────────────────────────────────────────────────────
import { API_BASE_URL } from '../config.js';

async function apiCall(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Hôte : créer un stream ────────────────────────────────────
// Retourne { token, roomName, wsUrl }
export const createStream = (displayName, roomName) =>
  apiCall('/api/stream/create', { displayName, roomName });

// ── Spectateur : rejoindre un stream ─────────────────────────
// Retourne { token, roomName, wsUrl }
export const joinStream = (displayName, roomName) =>
  apiCall('/api/stream/join', { displayName, roomName });

// ── Hôte : inviter un spectateur sur scène ───────────────────
// Retourne { success }
export const inviteToStage = (roomName, identity) =>
  apiCall('/api/stream/invite-to-stage', { roomName, identity });

// ── Hôte : retirer quelqu'un de la scène ─────────────────────
// Retourne { success }
export const removeFromStage = (roomName, identity) =>
  apiCall('/api/stream/remove-from-stage', { roomName, identity });

// ── Spectateur accepte l'invitation sur scène ────────────────
// Retourne { token } (nouveau token avec canPublish=true)
export const acceptStageInvite = (roomName, identity) =>
  apiCall('/api/stream/accept-stage', { roomName, identity });

// ── Hôte : terminer le stream ────────────────────────────────
export const endStream = (roomName) =>
  apiCall('/api/stream/end', { roomName });

// ── GET : infos sur un stream actif ──────────────────────────
export const getStreamInfo = async (roomName) => {
  const res = await fetch(`${API_BASE_URL}/api/stream/info/${roomName}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Stream non trouvé');
  return res.json();
};