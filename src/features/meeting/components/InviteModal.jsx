// src/features/meeting/components/InviteModal.jsx
// ─────────────────────────────────────────────────────────────
// Modal d'invitation — lien complet + code de réunion
// Style Google Meet : propre, sobre, efficace
// ─────────────────────────────────────────────────────────────
import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Copy, Check, Link2, Hash, Share2 } from 'lucide-react';
import { useMeeting } from '../context/MeetingContext';

// ── QR code via service externe ───────────────────────────────
function QRCanvas({ text, size = 160 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !text) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&bgcolor=0b1022&color=ffffff&margin=8&format=png`;
    img.onload = () => {
      const ctx = ref.current.getContext('2d');
      ref.current.width = size;
      ref.current.height = size;
      ctx.fillStyle = '#0b1022';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
    };
    img.onerror = () => {
      const ctx = ref.current.getContext('2d');
      ref.current.width = size; ref.current.height = size;
      ctx.fillStyle = '#0b1022'; ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '11px monospace'; ctx.textAlign = 'center';
      ctx.fillText('QR non disponible', size/2, size/2);
    };
  }, [text, size]);
  return <canvas ref={ref} width={size} height={size} style={{ borderRadius: 8, display: 'block' }} />;
}

export default function InviteModal({ onClose }) {
  const { roomName } = useMeeting();
  const joinUrl = `${window.location.origin}/prejoin/${roomName}?role=participant`;

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [tab, setTab] = useState('link');

  const copyLink = useCallback(async () => {
    await navigator.clipboard.writeText(joinUrl).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, [joinUrl]);

  const copyCode = useCallback(async () => {
    await navigator.clipboard.writeText(roomName).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }, [roomName]);

  const nativeShare = useCallback(async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: 'Rejoins la réunion JokkoMeet',
        text: `Code de réunion : ${roomName}`,
        url: joinUrl,
      });
    } catch {}
  }, [joinUrl, roomName]);

  const tabStyle = (key) => ({
    flex: 1, padding: '7px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: tab === key ? 'rgba(37,99,235,0.35)' : 'transparent',
    color: tab === key ? '#fff' : 'rgba(255,255,255,0.4)',
    fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#0d1a3a', borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '24px 22px', maxWidth: 400, width: '100%',
        boxShadow: '0 28px 72px rgba(0,0,0,0.7)',
        animation: 'inviteIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        position: 'relative',
      }}>
        {/* Fermer */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14,
          width: 28, height: 28, borderRadius: 8, border: 'none',
          background: 'rgba(255,255,255,0.07)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={14} color="rgba(255,255,255,0.5)" />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Link2 size={17} color="#60a5fa" />
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 14, margin: 0 }}>
              Inviter des participants
            </p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0 }}>
              Partagez le lien ou le code de réunion
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', borderRadius: 10, background: 'rgba(255,255,255,0.05)',
          padding: 3, gap: 3, marginBottom: 16,
        }}>
          <button style={tabStyle('link')} onClick={() => setTab('link')}>🔗 Lien complet</button>
          <button style={tabStyle('code')} onClick={() => setTab('code')}>🔢 Code</button>
          <button style={tabStyle('qr')}   onClick={() => setTab('qr')}>📱 QR Code</button>
        </div>

        {/* Onglet LIEN */}
        {tab === 'link' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* URL */}
            <div style={{
              padding: '11px 13px', borderRadius: 12,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>
                Lien d'invitation
              </p>
              <p style={{ color: '#60a5fa', fontSize: 11, margin: 0, fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.5 }}>
                {joinUrl}
              </p>
            </div>

            <button onClick={copyLink} style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none',
              background: copiedLink ? 'rgba(34,197,94,0.2)' : '#2563eb',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s',
            }}>
              {copiedLink ? <Check size={15} /> : <Copy size={15} />}
              {copiedLink ? 'Lien copié !' : 'Copier le lien complet'}
            </button>

            {typeof navigator.share === 'function' && (
              <button onClick={nativeShare} style={{
                width: '100%', padding: '11px', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <Share2 size={15} /> Partager via…
              </button>
            )}
          </div>
        )}

        {/* Onglet CODE */}
        {tab === 'code' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              padding: '18px', borderRadius: 14, textAlign: 'center',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 10px' }}>
                Code de réunion
              </p>
              <p style={{
                color: '#fff', fontFamily: 'monospace', fontSize: 28, fontWeight: 800,
                letterSpacing: '0.2em', margin: 0,
              }}>
                {roomName}
              </p>
            </div>

            <div style={{
              padding: '10px 13px', borderRadius: 10,
              background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                Les participants saisissent ce code sur{' '}
                <span style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: 10 }}>
                  {window.location.origin}
                </span>
              </p>
            </div>

            <button onClick={copyCode} style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none',
              background: copiedCode ? 'rgba(34,197,94,0.2)' : '#2563eb',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s',
            }}>
              {copiedCode ? <Check size={15} /> : <Hash size={15} />}
              {copiedCode ? 'Code copié !' : 'Copier le code'}
            </button>
          </div>
        )}

        {/* Onglet QR */}
        {tab === 'qr' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{
              padding: 12, borderRadius: 16, background: '#0b1022',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <QRCanvas text={joinUrl} size={160} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', margin: 0 }}>
              Scannez pour rejoindre directement
            </p>
            <button onClick={copyLink} style={{
              padding: '9px 20px', borderRadius: 11, border: 'none',
              background: copiedLink ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
              color: copiedLink ? '#4ade80' : 'rgba(255,255,255,0.6)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              {copiedLink ? <Check size={13} /> : <Copy size={13} />}
              {copiedLink ? 'Lien copié !' : 'Copier le lien'}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes inviteIn {
          from { opacity:0; transform:scale(0.93) translateY(8px); }
          to   { opacity:1; transform:scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  );
}