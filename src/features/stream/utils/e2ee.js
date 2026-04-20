// src/features/stream/utils/e2ee.js
// ─────────────────────────────────────────────────────────────────────────────
// Utilitaires E2EE pour JokkoLive — API officielle LiveKit SDK
//
// PRINCIPE :
//   Le SDK livekit-client gère TOUT le chiffrement en interne via :
//     • ExternalE2EEKeyProvider  → fournit la clé (PBKDF2 si string, HKDF si ArrayBuffer)
//     • Worker officiel          → `livekit-client/e2ee-worker` (NE PAS recréer en blob)
//     • room.setE2EEEnabled()    → active/désactive sur tous les tracks
//
// CE FICHIER expose uniquement :
//   createKeyProvider()       → crée l'instance ExternalE2EEKeyProvider
//   createE2EEWorker()        → instancie le Worker officiel via Vite import.meta.url
//   isE2EESupported()         → détecte la compatibilité navigateur
//   getE2EECompatibility()    → diagnostic détaillé pour le panneau de test UI
//
// ⚠️  IMPORTANT — Headers HTTP requis côté serveur (nginx / vite.config.js) :
//       Cross-Origin-Opener-Policy:   same-origin
//       Cross-Origin-Embedder-Policy: require-corp
//   Sans ces headers, SharedArrayBuffer est bloqué et le Worker E2EE échoue.
//   Pour Vite en dev, ajoute dans vite.config.js :
//     server: { headers: { 'Cross-Origin-Opener-Policy': 'same-origin',
//                          'Cross-Origin-Embedder-Policy': 'require-corp' } }
// ─────────────────────────────────────────────────────────────────────────────

import { ExternalE2EEKeyProvider } from 'livekit-client';

// ── createKeyProvider ─────────────────────────────────────────
// Crée une instance ExternalE2EEKeyProvider (clé partagée pour toute la room).
// Doit être créée UNE SEULE FOIS par session et passée dans RoomOptions.encryption.
// Appeler ensuite keyProvider.setKey(roomCode) juste avant room.setE2EEEnabled(true).
//
// setKey(string)      → PBKDF2  : recommandé pour compatibilité cross-SDK
// setKey(ArrayBuffer) → HKDF    : plus rapide, moins compatible Python/iOS
//
// La clé dérivée est identique pour tous les participants qui passent le même
// string → ils déchiffrent les flux des autres automatiquement.
export function createKeyProvider() {
  return new ExternalE2EEKeyProvider();
}

// ── createE2EEWorker ──────────────────────────────────────────
// Instancie le Worker officiel LiveKit via Vite.
// Vite résout `livekit-client/e2ee-worker` depuis node_modules et le bundle
// en fichier worker séparé automatiquement grâce à `new URL(..., import.meta.url)`.
//
// ⚠️  NE JAMAIS :
//   • Créer un Blob worker maison (RTCRtpScriptTransform manuel)
//   • Utiliser un chemin absolu string '/e2ee-worker.js' (ne fonctionne pas en prod)
//   • Appeler createE2EEWorker() plusieurs fois pour la même Room
//     (passer l'instance dans RoomOptions puis ne plus y toucher)
export function createE2EEWorker() {
  return new Worker(
    new URL('livekit-client/e2ee-worker', import.meta.url),
  );
}

// ── isE2EESupported ───────────────────────────────────────────
// Retourne true si le navigateur supporte le E2EE LiveKit.
// Requis : RTCRtpScriptTransform (Chrome 94+, Edge 94+, Firefox 117+)
//          + Web Crypto API (crypto.subtle)
// ⚠️  Ne vérifie pas les headers COOP/COEP — utiliser getE2EECompatibility()
//    pour un diagnostic complet.
export function isE2EESupported() {
  try {
    return (
      typeof window                !== 'undefined' &&
      typeof crypto?.subtle        !== 'undefined' &&
      typeof RTCRtpSender          !== 'undefined' &&
      typeof RTCRtpScriptTransform !== 'undefined'
    );
  } catch {
    return false;
  }
}

// ── getE2EECompatibility ──────────────────────────────────────
// Diagnostic complet — utilisé par le panneau Test du modal E2EE.
// Retourne un objet décrivant précisément ce qui manque si non supporté.
export function getE2EECompatibility() {
  const hasCrypto    = typeof crypto?.subtle        !== 'undefined';
  const hasTransform = typeof RTCRtpScriptTransform !== 'undefined';
  const hasRTC       = typeof RTCRtpSender          !== 'undefined';
  const isSecure     = typeof location !== 'undefined' &&
                       (location.protocol === 'https:' || location.hostname === 'localhost');

  const supported = hasCrypto && hasTransform && hasRTC && isSecure;

  let reason = null;
  if (!isSecure)      reason = 'HTTPS requis (ou localhost en dev)';
  else if (!hasCrypto)    reason = 'Web Crypto API non disponible';
  else if (!hasRTC)       reason = 'WebRTC non supporté par ce navigateur';
  else if (!hasTransform) reason = 'RTCRtpScriptTransform requis — Chrome 94+ / Edge 94+ / Firefox 117+';

  return { supported, hasCrypto, hasTransform, hasRTC, isSecure, reason };
}