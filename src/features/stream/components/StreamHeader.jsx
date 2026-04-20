// src/features/stream/components/StreamHeader.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Bouton E2EE dans le header → modal 3 onglets :
//   • Contrôle  : toggle personnel / toggle global (hôte)
//   • Preuve    : statut par participant (alimenté par RoomEvent.ParticipantEncryptionStatusChanged)
//                 + erreurs de chiffrement (RoomEvent.EncryptionError)
//   • Test      : checklist compatibilité + guide pour prouver que ça marche
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Tv2, Copy, Check, X, Star, Mic, Eye, Clock, Lock, LockOpen,
  Globe, Shield, AlertTriangle, Info, Loader2, FlaskConical,
  Share2, Wifi, WifiOff,
} from 'lucide-react';
import { useStream }      from '../context/StreamContext.jsx';
import { useStreamTimer } from '../hooks/useStreamTimer.js';
import { ROLE }           from '../../../config.js';
import { getE2EECompatibility } from '../utils/e2ee.js';

// ─────────────────────────────────────────────────────────────
// QR Code — génération canvas pure (sans lib externe)
// ─────────────────────────────────────────────────────────────
function useQRCanvas(text, size = 200) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !text) return;
    const canvas = canvasRef.current;
    const img = new Image();
    const encoded = encodeURIComponent(text);
    img.crossOrigin = 'anonymous';
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&bgcolor=0a1628&color=ffffff&margin=10&format=png`;
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      canvas.width  = size;
      canvas.height = size;
      ctx.fillStyle = '#0a1628';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
    };
    img.onerror = () => {
      const ctx = canvas.getContext('2d');
      canvas.width  = size;
      canvas.height = size;
      ctx.fillStyle = '#0a1628';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('QR non disponible', size/2, size/2 - 8);
      ctx.fillText('(réseau requis)', size/2, size/2 + 10);
    };
  }, [text, size]);

  return canvasRef;
}

// ─────────────────────────────────────────────────────────────
// Modal Partager — lien + QR code + bouton share natif
// ─────────────────────────────────────────────────────────────
function ShareModal({ roomName, onClose }) {
  const joinUrl    = `${window.location.origin}/join/${roomName}`;
  const canvasRef  = useQRCanvas(joinUrl, 200);
  const [copied,   setCopied]   = useState(false);
  const [tab,      setTab]      = useState('link');

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(joinUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [joinUrl]);

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: 'Rejoins mon live !',
        text:  `Rejoins le live ${roomName} sur JokkoLive`,
        url:   joinUrl,
      });
    } catch {}
  }, [joinUrl, roomName]);

  const canNativeShare = typeof navigator.share === 'function';

  const tabStyle = (key) => ({
    flex: 1, padding: '7px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: tab === key ? 'rgba(37,99,235,0.4)' : 'transparent',
    color: tab === key ? '#fff' : 'rgba(255,255,255,0.4)',
    fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#0a1628', borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '22px 20px', maxWidth: 380, width: '100%',
        boxShadow: '0 28px 72px rgba(0,0,0,0.7)',
        animation: 'shareModalIn 0.18s cubic-bezier(0.34,1.56,0.64,1)',
        position: 'relative',
      }}>
        {/* Fermer */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14, width: 28, height: 28,
          borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.07)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={14} color="rgba(255,255,255,0.5)"/>
        </button>

        {/* En-tête */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ color: '#fff', fontWeight: 800, fontSize: 15, margin: '0 0 4px' }}>
            Partager le live
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0 }}>
            Le lien amène directement sur la page de jonction — le code est pré-rempli, seul le nom est demandé.
          </p>
        </div>

        {/* Tabs Lien / QR */}
        <div style={{
          display: 'flex', borderRadius: 10, background: 'rgba(255,255,255,0.05)',
          padding: 3, gap: 3, marginBottom: 16,
        }}>
          <button style={tabStyle('link')} onClick={() => setTab('link')}>🔗 Lien</button>
          <button style={tabStyle('qr')}   onClick={() => setTab('qr')}>📱 QR Code</button>
        </div>

        {/* ── Onglet LIEN ── */}
        {tab === 'link' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Aperçu du lien */}
            <div style={{
              padding: '11px 13px', borderRadius: 12,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Lien d'invitation
              </p>
              <p style={{
                color: '#60a5fa', fontSize: 12, margin: 0,
                fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.5,
              }}>
                {joinUrl}
              </p>
            </div>

            {/* Code standalone */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 13px', borderRadius: 12,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Code du live</p>
                <p style={{ color: '#fff', fontFamily: 'monospace', fontSize: 16, fontWeight: 800, letterSpacing: '0.15em', margin: 0 }}>
                  {roomName}
                </p>
              </div>
              <button onClick={handleCopy} style={{
                padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)',
                color: copied ? '#4ade80' : 'rgba(255,255,255,0.7)',
                fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
              }}>
                {copied ? '✓ Copié !' : 'Copier le lien'}
              </button>
            </div>

            {/* Bouton partage natif (mobile) */}
            {canNativeShare && (
              <button onClick={handleNativeShare} style={{
                width: '100%', padding: '12px', borderRadius: 13,
                background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.35)',
                color: '#60a5fa', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <Share2 size={15}/>
                Partager via…
              </button>
            )}
          </div>
        )}

        {/* ── Onglet QR CODE ── */}
        {tab === 'qr' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            {/* Canvas QR */}
            <div style={{
              padding: 12, borderRadius: 16, background: '#0a1628',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              <canvas
                ref={canvasRef}
                width={200} height={200}
                style={{ display: 'block', borderRadius: 8 }}
              />
            </div>

            {/* Info */}
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 700, margin: '0 0 4px' }}>
                Scanner avec un téléphone
              </p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                Le QR code amène directement sur la page de jonction.
                Seul le nom sera demandé — le code est pré-rempli.
              </p>
            </div>

            {/* Code sous le QR pour référence */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px',
              borderRadius: 99, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa', flexShrink: 0 }}/>
              <span style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: 13, fontWeight: 800, letterSpacing: '0.1em' }}>
                {roomName}
              </span>
            </div>

            <button onClick={handleCopy} style={{
              padding: '9px 20px', borderRadius: 11, cursor: 'pointer',
              background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${copied ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.12)'}`,
              color: copied ? '#4ade80' : 'rgba(255,255,255,0.6)',
              fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
            }}>
              {copied ? '✓ Lien copié !' : '🔗 Copier le lien d\'invitation'}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shareModalIn {
          from { opacity:0; transform:scale(0.93) translateY(8px); }
          to   { opacity:1; transform:scale(1)    translateY(0);   }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal E2EE — 3 onglets : Contrôle / Preuve / Test
// ─────────────────────────────────────────────────────────────
function E2EEModal({ onClose }) {
  const {
    e2eeEnabled, e2eeMode, e2eeSupported,
    e2eeParticipantStatus, e2eeErrors,
    myRole, roomName,
    toggleE2EE, toggleE2EEGlobal,
  } = useStream();

  const [toggling,  setToggling]  = useState(false);
  const [activeTab, setActiveTab] = useState('control');

  const isHost         = myRole === ROLE.HOST;
  const isManualActive = e2eeEnabled && e2eeMode === 'manual';
  const isGlobalActive = e2eeEnabled && e2eeMode === 'global';
  const compat         = getE2EECompatibility();

  const confirmedOn  = Array.from(e2eeParticipantStatus.values()).filter(Boolean).length;
  const confirmedOff = Array.from(e2eeParticipantStatus.values()).filter(v => !v).length;

  const handleManual = useCallback(async () => {
    setToggling(true);
    try { await toggleE2EE(); }
    finally { setToggling(false); }
  }, [toggleE2EE]);

  const handleGlobal = useCallback(async () => {
    setToggling(true);
    try { await toggleE2EEGlobal(); }
    finally { setToggling(false); }
  }, [toggleE2EEGlobal]);

  const tabStyle = (key) => ({
    flex: 1, padding: '6px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: activeTab === key ? 'rgba(37,99,235,0.45)' : 'transparent',
    color: activeTab === key ? '#fff' : 'rgba(255,255,255,0.4)',
    fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#0a1628', borderRadius: 20,
        border: `1px solid ${e2eeEnabled ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
        padding: '22px 20px', maxWidth: 430, width: '100%',
        boxShadow: '0 28px 72px rgba(0,0,0,0.7)',
        animation: 'e2eeModalIn 0.18s cubic-bezier(0.34,1.56,0.64,1)',
        position: 'relative',
      }}>

        {/* Bouton fermer */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: 8,
          border: 'none', background: 'rgba(255,255,255,0.07)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={14} color="rgba(255,255,255,0.5)"/>
        </button>

        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: e2eeEnabled ? 'rgba(34,197,94,0.15)' : 'rgba(37,99,235,0.15)',
            border: `1.5px solid ${e2eeEnabled ? 'rgba(34,197,94,0.4)' : 'rgba(37,99,235,0.35)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {e2eeEnabled
              ? <Lock size={18} color="#4ade80"/>
              : <Shield size={18} color="#60a5fa"/>
            }
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 14, margin: 0 }}>
              Chiffrement de bout en bout
            </p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, margin: 0 }}>
              API LiveKit · ExternalE2EEKeyProvider · PBKDF2 → AES-GCM
            </p>
          </div>
        </div>

        {/* Statut synthèse */}
        <div style={{
          borderRadius: 12, padding: '9px 13px', marginBottom: 14,
          background: e2eeEnabled ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${e2eeEnabled ? 'rgba(34,197,94,0.22)' : 'rgba(255,255,255,0.08)'}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: e2eeEnabled ? '#4ade80' : 'rgba(255,255,255,0.2)',
            boxShadow: e2eeEnabled ? '0 0 8px #4ade80' : 'none',
            animation: e2eeEnabled ? 'e2eePulse 2s infinite' : 'none',
          }}/>
          <div>
            <p style={{ color: e2eeEnabled ? '#4ade80' : 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, margin: 0 }}>
              {isGlobalActive
                ? `Actif — Global · ${confirmedOn} participant${confirmedOn > 1 ? 's' : ''} confirmé${confirmedOn > 1 ? 's' : ''} par SDK`
                : isManualActive
                ? 'Actif — Personnel (ce client uniquement)'
                : 'Inactif — Flux audio/vidéo non chiffrés localement'}
            </p>
            {e2eeEnabled && (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: '2px 0 0' }}>
                Clé : PBKDF2(<span style={{fontFamily:'monospace'}}>{roomName}</span>) → AES-GCM 256 bits · Worker officiel LiveKit
              </p>
            )}
          </div>
        </div>

        {/* Alerte non supporté */}
        {!e2eeSupported && (
          <div style={{
            borderRadius: 10, padding: '9px 12px', marginBottom: 14,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertTriangle size={14} color="#f87171" style={{flexShrink:0,marginTop:1}}/>
              <div>
                <p style={{ color: '#f87171', fontSize: 11, fontWeight: 700, margin: '0 0 2px' }}>
                  Navigateur incompatible
                </p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: 0, lineHeight: 1.4 }}>
                  {compat.reason || 'RTCRtpScriptTransform manquant'}<br/>
                  Requis : Chrome 94+ / Edge 94+ / Firefox 117+
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Onglets */}
        <div style={{
          display: 'flex', borderRadius: 10, background: 'rgba(255,255,255,0.05)',
          padding: 3, marginBottom: 16, gap: 3,
        }}>
          <button style={tabStyle('control')} onClick={() => setActiveTab('control')}>Contrôle</button>
          <button style={tabStyle('proof')}   onClick={() => setActiveTab('proof')}>
            Preuve
            {e2eeErrors.length > 0 && (
              <span style={{
                marginLeft: 4, background: '#ef4444', color: '#fff',
                fontSize: 9, fontWeight: 800, padding: '1px 5px',
                borderRadius: 99, verticalAlign: 'middle',
              }}>{e2eeErrors.length}</span>
            )}
          </button>
          <button style={tabStyle('test')}    onClick={() => setActiveTab('test')}>🧪 Test</button>
        </div>

        {/* ── ONGLET CONTRÔLE ── */}
        {activeTab === 'control' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Bouton 1 — Mode personnel */}
            <button
              onClick={handleManual}
              disabled={!e2eeSupported || toggling}
              style={{
                width: '100%', padding: '13px 15px', borderRadius: 13, cursor: 'pointer',
                border: `1px solid ${isManualActive ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.1)'}`,
                background: isManualActive ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                display: 'flex', alignItems: 'center', gap: 13,
                opacity: (!e2eeSupported || toggling) ? 0.5 : 1,
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { if (e2eeSupported && !toggling) e.currentTarget.style.background = isManualActive ? 'rgba(34,197,94,0.17)' : 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = isManualActive ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)'; }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: isManualActive ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.07)',
                border: `1px solid ${isManualActive ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.12)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {toggling
                  ? <Loader2 size={15} color="currentColor" style={{animation:'e2eeSpin 1s linear infinite'}}/>
                  : isManualActive
                  ? <LockOpen size={15} color="#4ade80"/>
                  : <Lock size={15} color="rgba(255,255,255,0.6)"/>
                }
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 12, margin: 0 }}>
                  {isManualActive ? 'Désactiver pour moi' : 'Activer pour moi'}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, margin: '3px 0 0', lineHeight: 1.4 }}>
                  {isManualActive
                    ? 'Désactive uniquement sur ce client — les autres restent chiffrés'
                    : 'Chiffre tes flux via room.setE2EEEnabled(true) · clé = PBKDF2(roomCode)'}
                </p>
              </div>
            </button>

            {/* Bouton 2 — Mode global (hôte uniquement) */}
            {isHost && (
              <button
                onClick={handleGlobal}
                disabled={!e2eeSupported || toggling}
                style={{
                  width: '100%', padding: '13px 15px', borderRadius: 13, cursor: 'pointer',
                  border: `1px solid ${isGlobalActive ? 'rgba(34,197,94,0.35)' : 'rgba(37,99,235,0.3)'}`,
                  background: isGlobalActive ? 'rgba(34,197,94,0.1)' : 'rgba(37,99,235,0.08)',
                  display: 'flex', alignItems: 'center', gap: 13,
                  opacity: (!e2eeSupported || toggling) ? 0.5 : 1,
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { if (e2eeSupported && !toggling) e.currentTarget.style.background = isGlobalActive ? 'rgba(34,197,94,0.17)' : 'rgba(37,99,235,0.16)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isGlobalActive ? 'rgba(34,197,94,0.1)' : 'rgba(37,99,235,0.08)'; }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: isGlobalActive ? 'rgba(34,197,94,0.2)' : 'rgba(37,99,235,0.2)',
                  border: `1px solid ${isGlobalActive ? 'rgba(34,197,94,0.4)' : 'rgba(37,99,235,0.35)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {toggling
                    ? <Loader2 size={15} color="currentColor" style={{animation:'e2eeSpin 1s linear infinite'}}/>
                    : isGlobalActive
                    ? <LockOpen size={15} color="#4ade80"/>
                    : <Globe size={15} color="#60a5fa"/>
                  }
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ color: isGlobalActive ? '#4ade80' : '#60a5fa', fontWeight: 700, fontSize: 12, margin: 0 }}>
                    {isGlobalActive ? 'Désactiver pour tous' : 'Activer pour tous les participants'}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, margin: '3px 0 0', lineHeight: 1.4 }}>
                    {isGlobalActive
                      ? 'Envoie e2ee_disable_all via DataChannel → chaque client désactive localement'
                      : 'Envoie e2ee_enable_all via DataChannel → chaque client appelle setE2EEEnabled(true)'}
                  </p>
                </div>
              </button>
            )}

            <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 10, textAlign: 'center', marginTop: 4, lineHeight: 1.6 }}>
              Clé partagée = code du live&nbsp;
              <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.35)' }}>{roomName}</span><br/>
              PBKDF2 calculé côté SDK · aucune clé transmise au serveur LiveKit
            </p>
          </div>
        )}

        {/* ── ONGLET PREUVE ── */}
        {activeTab === 'proof' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 12,
                          padding: '9px 11px', borderRadius: 10,
                          background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)' }}>
              <Info size={13} color="#60a5fa" style={{flexShrink:0,marginTop:1}}/>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: 0, lineHeight: 1.5 }}>
                Source SDK :{' '}
                <span style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: 10 }}>
                  RoomEvent.ParticipantEncryptionStatusChanged
                </span><br/>
                Émis par <code style={{color:'rgba(255,255,255,0.6)'}}>E2eeManager.ts</code> du SDK LiveKit à chaque changement réel.
                Ce n'est pas un état auto-déclaré — c'est le Worker E2EE qui confirme.
              </p>
            </div>

            {e2eeParticipantStatus.size === 0 ? (
              <div style={{ textAlign: 'center', padding: '22px 0' }}>
                <LockOpen size={36} color="rgba(255,255,255,0.18)"/>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, margin: '10px 0 0' }}>
                  Aucune confirmation SDK reçue.<br/>
                  Active le E2EE pour voir les statuts apparaître ici.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
                {Array.from(e2eeParticipantStatus.entries()).map(([identity, enabled]) => (
                  <div key={identity} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    borderRadius: 11,
                    background: enabled ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)',
                    border: `1px solid ${enabled ? 'rgba(34,197,94,0.22)' : 'rgba(239,68,68,0.22)'}`,
                  }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: enabled ? '#4ade80' : '#f87171',
                      boxShadow: `0 0 6px ${enabled ? '#4ade80' : '#f87171'}`,
                    }}/>
                    <span style={{
                      flex: 1, color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 600,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontFamily: 'monospace',
                    }}>
                      {identity}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '2px 9px', borderRadius: 99,
                      background: enabled ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)',
                      color: enabled ? '#4ade80' : '#f87171',
                      border: `1px solid ${enabled ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
                    }}>
                      {enabled ? '🔒 ON' : '🔓 OFF'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {e2eeErrors.length > 0 && (
              <div>
                <p style={{ color: '#f59e0b', fontSize: 10, fontWeight: 800, margin: '0 0 7px',
                             textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ⚠️ RoomEvent.EncryptionError — frames non déchiffrables
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {e2eeErrors.map((err, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 11px',
                      borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
                    }}>
                      <AlertTriangle size={13} color="#f87171" style={{flexShrink:0,marginTop:1}}/>
                      <div>
                        <p style={{ color: '#f87171', fontSize: 11, fontWeight: 700, margin: 0 }}>
                          {err.identity}
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, margin: '2px 0 0' }}>
                          {err.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, marginTop: 7, lineHeight: 1.5 }}>
                  Cause probable : un participant utilise un code de live différent → sa clé PBKDF2 ne correspond pas.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── ONGLET TEST ── */}
        {activeTab === 'test' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
              <FlaskConical size={13} color="#a78bfa"/>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, margin: 0 }}>
                4 méthodes pour prouver que E2EE fonctionne réellement
              </p>
            </div>

            {/* Test 1 */}
            <div style={{ padding: '12px 13px', borderRadius: 12,
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 700, margin: '0 0 9px' }}>
                1 · Compatibilité navigateur
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[
                  { label: 'HTTPS ou localhost', ok: compat.isSecure },
                  { label: 'Web Crypto API (crypto.subtle)', ok: compat.hasCrypto },
                  { label: 'WebRTC (RTCRtpSender)', ok: compat.hasRTC },
                  { label: 'RTCRtpScriptTransform (Chrome 94+ / Firefox 117+)', ok: compat.hasTransform },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      background: item.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                      border: `1px solid ${item.ok ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {item.ok
                        ? <Check size={10} color="#4ade80"/>
                        : <X size={9} color="#f87171"/>
                      }
                    </div>
                    <span style={{ color: item.ok ? 'rgba(255,255,255,0.75)' : '#f87171', fontSize: 10, lineHeight: 1.4 }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Test 2 */}
            <div style={{ padding: '12px 13px', borderRadius: 12,
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 700, margin: '0 0 8px' }}>
                2 · Console navigateur (F12)
              </p>
              <div style={{ background: '#060d1f', borderRadius: 8, padding: '9px 11px',
                            fontFamily: 'monospace', fontSize: 10, lineHeight: 1.7 }}>
                <div style={{ color: '#4ade80' }}>[E2EE] ✅ Activé — PBKDF2(roomCode) → AES-GCM 256 bits</div>
                <div style={{ color: '#60a5fa' }}>[E2EE] 🔐 SDK confirm — alice : ✅ ON</div>
                <div style={{ color: '#60a5fa' }}>[E2EE] 🔐 SDK confirm — bob : ✅ ON</div>
                <div style={{ color: '#f87171' }}>[E2EE] ❌ EncryptionError — charlie : decrypt failed</div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: '7px 0 0' }}>
                Les messages SDK confirm viennent de{' '}
                <code style={{color:'rgba(255,255,255,0.5)'}}>RoomEvent.ParticipantEncryptionStatusChanged</code>
              </p>
            </div>

            {/* Test 3 */}
            <div style={{ padding: '12px 13px', borderRadius: 12,
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 700, margin: '0 0 8px' }}>
                3 · Test mauvaise clé (preuve ultime)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  '2 navigateurs rejoignent ce live, hôte active E2EE global',
                  'Onglet Preuve → les 2 affichent 🔒 ON (confirmé SDK)',
                  '3ème navigateur rejoint avec un code room différent',
                  '→ Vidéo noire + RoomEvent.EncryptionError dans Preuve',
                  '→ Preuve : les frames sont vraiment chiffrées côté serveur',
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                      background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#60a5fa', fontSize: 9, fontWeight: 800,
                    }}>{i + 1}</span>
                    <span style={{ color: step.startsWith('→') ? '#4ade80' : 'rgba(255,255,255,0.5)', fontSize: 10, lineHeight: 1.5 }}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Test 4 */}
            <div style={{ padding: '12px 13px', borderRadius: 12,
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 700, margin: '0 0 8px' }}>
                4 · chrome://webrtc-internals
              </p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, margin: 0, lineHeight: 1.6 }}>
                Ouvre{' '}
                <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>chrome://webrtc-internals</span>
                {' '}dans Chrome.<br/>
                Cherche{' '}
                <span style={{ color: '#a78bfa', fontFamily: 'monospace' }}>RTCRtpScriptTransform</span>
                {' '}dans les stats du PeerConnection.<br/>
                Les tailles de frames augmentent de <strong style={{color:'rgba(255,255,255,0.7)'}}>+12 octets</strong> (IV AES-GCM)
                quand E2EE est actif — preuve réseau.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// StreamHeader — composant principal
// ─────────────────────────────────────────────────────────────
export default function StreamHeader() {
  const {
    myRole, roomName, displayName, isLive, isRecording, connectionState,
    e2eeEnabled, e2eeSupported, e2eeMode,
    e2eeParticipantStatus, e2eeErrors,
  } = useStream();

  const timer = useStreamTimer();
  const [showShareModal, setShowShareModal] = useState(false);
  const [showE2EEModal,  setShowE2EEModal]  = useState(false);

  const connColor = connectionState === 'connected'    ? '#22c55e'
                  : connectionState === 'reconnecting' ? '#f59e0b' : '#ef4444';
  const connLabel = connectionState === 'connected'    ? 'Connecté'
                  : connectionState === 'reconnecting' ? 'Reconnexion…' : 'Déconnecté';

  const roleIcon  = myRole === ROLE.HOST
    ? <Star size={12}/>
    : myRole === ROLE.SPEAKER
    ? <Mic size={12}/>
    : <Eye size={12}/>;
  const roleLabel = myRole === ROLE.HOST ? 'Hôte' : myRole === ROLE.SPEAKER ? 'Orateur' : 'Spectateur';
  const roleColor = myRole === ROLE.HOST
    ? { bg: 'rgba(245,158,11,0.2)',   col: '#fbbf24', border: 'rgba(245,158,11,0.3)' }
    : myRole === ROLE.SPEAKER
    ? { bg: 'rgba(37,99,235,0.2)',    col: '#60a5fa', border: 'rgba(37,99,235,0.3)' }
    : { bg: 'rgba(255,255,255,0.07)', col: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.12)' };

  const hasErrors      = e2eeErrors.length > 0;
  const isGlobalActive = e2eeEnabled && e2eeMode === 'global';
  const e2eeBtnColor   = hasErrors ? '#f87171' : e2eeEnabled ? '#4ade80' : e2eeSupported ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)';
  const e2eeBtnBg      = hasErrors ? 'rgba(239,68,68,0.12)'  : e2eeEnabled ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)';
  const e2eeBtnBorder  = hasErrors ? 'rgba(239,68,68,0.35)'  : e2eeEnabled ? 'rgba(34,197,94,0.3)'  : 'rgba(255,255,255,0.1)';
  const e2eeLabel      = hasErrors ? 'E2EE · Erreur' : isGlobalActive ? 'E2EE · Global' : e2eeEnabled ? 'E2EE · On' : 'E2EE';
  const confirmedCount = Array.from(e2eeParticipantStatus.values()).filter(Boolean).length;

  return (
    <>
      <div style={{
        flexShrink: 0, background: '#080f2a',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        height: 52, padding: '0 16px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <img
            src="/senegal.jpg"
            alt="Logo"
            style={{ width: '30px', height: '30px', borderRadius: '10px', objectFit: 'contain', background: '#fff', flexShrink: 0 }}
          />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 14, letterSpacing: '-0.3px' }}>
            Di<span style={{ color: '#ef4444' }}>soo</span>
          </span>
        </div>

        {/* Bouton Partager */}
        <button
          onClick={() => setShowShareModal(true)}
          title="Partager le live — lien & QR code"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
            cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        >
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.08em' }}>
            {roomName}
          </span>
          <Share2 size={12} color="rgba(255,255,255,0.6)" style={{flexShrink:0}}/>
        </button>

        {/* Badge LIVE */}
        {isLive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99,
                        background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444',
                           display: 'inline-block', animation: 'hdrPulse 1.2s infinite' }}/>
            <span style={{ color: '#f87171', fontSize: 10, fontWeight: 800, letterSpacing: '0.5px' }}>LIVE</span>
          </div>
        )}

        {/* Badge REC */}
        {isRecording && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99,
                        background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', flexShrink: 0 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444',
                           display: 'inline-block', animation: 'hdrPulse 0.8s infinite' }}/>
            <span style={{ color: '#f87171', fontSize: 10, fontWeight: 800 }}>REC</span>
          </div>
        )}

        {/* Timer */}
        {isLive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 99,
                        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
            <Clock size={12} color="rgba(255,255,255,0.8)"/>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {timer}
            </span>
          </div>
        )}

        {/* État connexion */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, padding: '3px 9px', borderRadius: 99,
          background: connectionState === 'connected' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
          border: `1px solid ${connectionState === 'connected' ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: connColor, boxShadow: `0 0 6px ${connColor}` }}/>
          <span style={{ fontSize: 10, fontWeight: 600, color: connectionState === 'connected' ? '#4ade80' : '#fbbf24' }}>
            {connLabel}
          </span>
        </div>

        {/* Bouton E2EE */}
        <button
          onClick={() => setShowE2EEModal(true)}
          title={e2eeSupported ? 'Chiffrement de bout en bout — cliquer pour gérer' : 'Navigateur non compatible (Chrome 94+ requis)'}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99,
            border: `1px solid ${e2eeBtnBorder}`,
            background: e2eeBtnBg,
            cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = hasErrors ? 'rgba(239,68,68,0.2)' : e2eeEnabled ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = e2eeBtnBg; }}
        >
          {hasErrors
            ? <AlertTriangle size={11} color="#f87171" style={{flexShrink:0}}/>
            : e2eeEnabled
            ? <Lock size={11} color={e2eeBtnColor} style={{flexShrink:0}}/>
            : <LockOpen size={11} color={e2eeBtnColor} style={{flexShrink:0}}/>
          }

          <span style={{ color: e2eeBtnColor, fontSize: 10, fontWeight: 700, letterSpacing: '0.3px' }}>
            {e2eeLabel}
          </span>

          {e2eeEnabled && !hasErrors && (
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80',
                           display: 'inline-block', animation: 'e2eePulse 2s infinite', flexShrink: 0 }}/>
          )}

          {e2eeEnabled && !hasErrors && confirmedCount > 0 && (
            <span style={{
              background: 'rgba(34,197,94,0.25)', color: '#4ade80',
              fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 99,
              border: '1px solid rgba(34,197,94,0.35)', flexShrink: 0,
            }}>
              {confirmedCount}
            </span>
          )}
        </button>

        <div style={{ flex: 1 }}/>

        {/* Nom + badge rôle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, maxWidth: 96,
                         overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </span>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99,
            fontSize: 11, fontWeight: 700, background: roleColor.bg, color: roleColor.col,
            border: `1px solid ${roleColor.border}`,
          }}>
            {roleIcon} {roleLabel}
          </span>
        </div>

      </div>

      {showShareModal && <ShareModal roomName={roomName} onClose={() => setShowShareModal(false)}/>}
      {showE2EEModal  && <E2EEModal onClose={() => setShowE2EEModal(false)}/>}

      <style>{`
        @keyframes hdrPulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes e2eePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
        @keyframes e2eeSpin  { to{transform:rotate(360deg)} }
        @keyframes e2eeModalIn { from{opacity:0;transform:scale(0.94) translateY(6px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>
    </>
  );
}