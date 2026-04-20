// src/features/stream/components/LeaveConfirmModal.jsx
//
// Hôte  → 2 options :
//   • Pause    → disconnectOnly() → live reste actif, spectateurs attendent
//               → flag host_paused + ?host_rejoin= pour la bannière Home
//   • Terminer → hostEndStream() → STREAM_ENDED diffusé, room supprimée côté serveur
//
// Spectateur → 1 bouton simple, code pré-rempli au retour sur Home
//
// Fermeture onglet → gérée dans Stream.jsx (beforeunload / visibilitychange)
// — même logique, sans UI

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStream } from '../context/StreamContext.jsx';
import { ROLE } from '../../../config.js';

const IcoEnd = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}>
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.43 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.34 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.3 8.9"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const IcoPause = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="10" y1="15" x2="10" y2="9"/>
    <line x1="14" y1="15" x2="14" y2="9"/>
  </svg>
);
const IcoLeave = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IcoX = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5"
       strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IcoWarning = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14,flexShrink:0}}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const Spinner = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
       strokeLinecap="round" style={{width:14,height:14,animation:'leaveSpin 0.8s linear infinite',flexShrink:0}}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

export default function LeaveConfirmModal({ onClose }) {
  const navigate = useNavigate();
  const {
    myRole, roomName, displayName,
    leaveStream, isRecording, stopRecording,
  } = useStream();

  const isHost = myRole === ROLE.HOST;
  const [loading, setLoading] = useState(null); // null | 'pause' | 'end' | 'leave'
  const busy = loading !== null;

  // ── Navigation helpers ────────────────────────────────────────
  const goHome = useCallback((tab, extra = {}) => {
    sessionStorage.setItem('stream_last_name', displayName || '');
    const params = new URLSearchParams({ name: displayName || '', tab });
    if (extra.room) { params.set('room', extra.room); sessionStorage.setItem('stream_last_room', extra.room); }
    else            { sessionStorage.removeItem('stream_last_room'); }
    if (extra.host_rejoin) params.set('host_rejoin', extra.host_rejoin);
    navigate(`/?${params.toString()}`);
  }, [navigate, displayName]);

  // ── Hôte — Pause ─────────────────────────────────────────────
  // Live reste actif côté LiveKit. On quitte juste notre connexion.
  // La bannière "reprendre" s'affiche sur Home grâce au flag sessionStorage.
  const handlePause = useCallback(async () => {
    setLoading('pause');
    try {
      if (isRecording) await stopRecording().catch(() => {});
      await leaveStream('pause');
      sessionStorage.setItem(`stream_host_paused_${roomName}`, '1');
      goHome('host', { host_rejoin: roomName });
    } catch (e) {
      console.error('[Leave] pause:', e);
      setLoading(null);
    }
  }, [leaveStream, isRecording, stopRecording, goHome, roomName]);

  // ── Hôte — Terminer définitivement ───────────────────────────
  // STREAM_ENDED diffusé → spectateurs voient "stream terminé" → redirigés.
  const handleEnd = useCallback(async () => {
    setLoading('end');
    try {
      if (isRecording) await stopRecording().catch(() => {});
      await leaveStream('end');
      sessionStorage.removeItem(`stream_host_paused_${roomName}`);
      goHome('host');
    } catch (e) {
      console.error('[Leave] end:', e);
      setLoading(null);
    }
  }, [leaveStream, isRecording, stopRecording, goHome, roomName]);

  // ── Spectateur — Quitter ──────────────────────────────────────
  const handleLeave = useCallback(async () => {
    setLoading('leave');
    try {
      await leaveStream('leave');
      goHome('viewer', { room: roomName });
    } catch (e) {
      console.error('[Leave] viewer:', e);
      setLoading(null);
    }
  }, [leaveStream, goHome, roomName]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#0f1d3e', borderRadius: 22,
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '28px 24px', maxWidth: 400, width: '100%',
        boxShadow: '0 28px 72px rgba(0,0,0,0.65)',
        animation: 'leaveModalIn 0.18s cubic-bezier(0.34,1.56,0.64,1)',
        position: 'relative',
      }}>

        {/* Fermer */}
        <button onClick={onClose} disabled={busy} style={{
          position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: 8,
          border: 'none', background: 'rgba(255,255,255,0.07)',
          cursor: busy ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: busy ? 0.35 : 1,
        }}>
          <IcoX/>
        </button>

        {/* ── HÔTE ─────────────────────────────────────────────── */}
        {isHost ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: 22 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', margin: '0 auto 14px',
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444',
              }}>
                <IcoEnd/>
              </div>
              <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '0 0 6px' }}>
                Que veux-tu faire ?
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: 0 }}>
                Code ·{' '}
                <span style={{ fontFamily: 'monospace', color: '#60a5fa', fontWeight: 700 }}>
                  {roomName}
                </span>
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Bouton Pause */}
              <button
                onClick={handlePause}
                disabled={busy}
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 14,
                  border: `1px solid ${loading==='pause' ? 'rgba(37,99,235,0.6)' : 'rgba(37,99,235,0.35)'}`,
                  background: loading==='pause' ? 'rgba(37,99,235,0.2)' : 'rgba(37,99,235,0.1)',
                  display: 'flex', alignItems: 'center', gap: 13,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy && loading !== 'pause' ? 0.45 : 1,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'rgba(37,99,235,0.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = loading==='pause' ? 'rgba(37,99,235,0.2)' : 'rgba(37,99,235,0.1)'; }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                  background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa',
                }}>
                  {loading === 'pause' ? <Spinner/> : <IcoPause/>}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ color: '#60a5fa', fontWeight: 700, fontSize: 13, margin: 0 }}>
                    Quitter temporairement
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '3px 0 0', lineHeight: 1.4 }}>
                    Le live reste actif · spectateurs attendent · tu peux reprendre
                  </p>
                </div>
              </button>

              {/* Bouton Terminer */}
              <button
                onClick={handleEnd}
                disabled={busy}
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 14,
                  border: `1px solid ${loading==='end' ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.3)'}`,
                  background: loading==='end' ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
                  display: 'flex', alignItems: 'center', gap: 13,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy && loading !== 'end' ? 0.45 : 1,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = loading==='end' ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)'; }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444',
                }}>
                  {loading === 'end' ? <Spinner/> : <IcoEnd/>}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ color: '#f87171', fontWeight: 700, fontSize: 13, margin: 0 }}>
                    Terminer le live
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '3px 0 0', lineHeight: 1.4 }}>
                    Tous les spectateurs seront déconnectés · action irréversible
                  </p>
                </div>
              </button>

              {/* Alerte enregistrement */}
              {isRecording && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
                  borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
                }}>
                  <IcoWarning/>
                  <p style={{ color: '#fbbf24', fontSize: 11, margin: 0, lineHeight: 1.4 }}>
                    Enregistrement en cours — il sera arrêté automatiquement.
                  </p>
                </div>
              )}

              {/* Annuler */}
              <button onClick={onClose} disabled={busy} style={{
                width: '100%', padding: '12px', borderRadius: 13, marginTop: 2,
                border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                color: 'rgba(255,255,255,0.45)', fontWeight: 600, fontSize: 13,
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.35 : 1, transition: 'all 0.15s',
              }}
                onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                Annuler
              </button>
            </div>
          </>
        ) : (
          /* ── SPECTATEUR ────────────────────────────────────────── */
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', margin: '0 auto 14px',
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444',
              }}>
                <IcoLeave/>
              </div>
              <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '0 0 6px' }}>
                Quitter le live ?
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>
                Tu pourras rejoindre à nouveau avec le même code.
              </p>
            </div>

            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 20,
              background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)',
              textAlign: 'center',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, margin: 0 }}>
                Code du live ·{' '}
                <span style={{ fontFamily: 'monospace', color: '#60a5fa', fontWeight: 700 }}>
                  {roomName}
                </span>
              </p>
              <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, margin: '4px 0 0' }}>
                Ce code sera pré-rempli à ton retour sur l'accueil
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleLeave}
                disabled={busy}
                style={{
                  width: '100%', padding: '13px', borderRadius: 13, border: 'none',
                  background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 14,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!busy) e.currentTarget.style.background = '#b91c1c'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#dc2626'; }}
              >
                {loading === 'leave' ? <Spinner/> : <IcoLeave/>}
                Quitter le live
              </button>
              <button
                onClick={onClose}
                disabled={busy}
                style={{
                  width: '100%', padding: '13px', borderRadius: 13,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
                  fontWeight: 600, fontSize: 14, cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy ? 0.5 : 1,
                }}
              >
                Rester dans le live
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes leaveModalIn {
          from { opacity:0; transform:scale(0.93) translateY(8px); }
          to   { opacity:1; transform:scale(1)    translateY(0);   }
        }
        @keyframes leaveSpin { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
}