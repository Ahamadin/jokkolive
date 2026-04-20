// src/features/stream/components/HandRaisedToast.jsx
// Notification main levée côté hôte
// ✅ Disparaît immédiatement quand le spectateur monte sur scène
import { useStream } from '../context/StreamContext.jsx';
import { ROLE } from '../../../config.js';

// Icône "Inviter" SVG — UserPlus sans lucide
const IcoUserPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="8.5" cy="7" r="4"/>
    <line x1="20" y1="8" x2="20" y2="14"/>
    <line x1="23" y1="11" x2="17" y2="11"/>
  </svg>
);

// Icône main levée SVG
const IcoHand = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" style={{width:20,height:20}}>
    <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/>
    <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2"/>
    <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8"/>
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
  </svg>
);

export default function HandRaisedToast() {
  const {
    myRole,
    handRaisedIds,
    participants,
    speakerIds,       // ← pour détecter si quelqu'un vient de monter
    hostInviteToStage,
  } = useStream();

  // Seulement visible pour l'hôte
  if (myRole !== ROLE.HOST) return null;

  // Filtrer : n'afficher que ceux qui ont la main levée ET qui ne sont PAS encore speakers
  // → dès qu'ils montent sur scène, speakerIds les contient et ils disparaissent ici
  const pendingHands = Array.from(handRaisedIds).filter(id => !speakerIds.has(id));

  if (pendingHands.length === 0) return null;

  const firstId   = pendingHands[0];
  const participant = participants.get(firstId);
  if (!participant) return null;

  const name = participant.name || participant.identity || '?';

  return (
    <div
      style={{
        position: 'absolute',
        top: 14,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        animation: 'toastSlideIn 0.25s cubic-bezier(.34,1.56,.64,1)',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        borderRadius: 18,
        minWidth: 280,
        maxWidth: 400,
        background: 'rgba(8,15,42,0.97)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(245,158,11,0.35)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>

        {/* Icône main */}
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(245,158,11,0.15)',
          border: '1px solid rgba(245,158,11,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <IcoHand />
        </div>

        {/* Texte */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, color: '#fff', fontSize: 13, fontWeight: 700,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {name}
          </p>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
            veut prendre la parole
          </p>
        </div>

        {/* Bouton Inviter */}
        <button
          onClick={() => hostInviteToStage(firstId)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 10, border: 'none',
            background: '#2563eb', color: '#fff',
            fontSize: 12, fontWeight: 700,
            cursor: 'pointer', flexShrink: 0,
            boxShadow: '0 2px 12px rgba(37,99,235,0.45)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
          onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
        >
          <IcoUserPlus />
          Inviter
        </button>

        {/* +N autres */}
        {pendingHands.length > 1 && (
          <span style={{
            color: 'rgba(255,255,255,0.3)', fontSize: 11,
            flexShrink: 0, fontWeight: 600,
          }}>
            +{pendingHands.length - 1}
          </span>
        )}
      </div>

      <style>{`
        @keyframes toastSlideIn {
          from { opacity:0; transform:translateX(-50%) translateY(-10px) scale(0.95); }
          to   { opacity:1; transform:translateX(-50%) translateY(0)     scale(1);    }
        }
      `}</style>
    </div>
  );
}