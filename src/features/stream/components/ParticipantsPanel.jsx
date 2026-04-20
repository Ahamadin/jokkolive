// src/features/stream/components/ParticipantsPanel.jsx
// Panneau participants — exactement comme JokkoMeet
import { useMemo } from 'react';
import { useStream } from '../context/StreamContext.jsx';
import { ROLE } from '../../../config.js';
import { UserPlus, UserMinus, Crown, Mic, Hand, X } from 'lucide-react';

const COLORS = ['#1a2b5c','#2563eb','#7c3aed','#0891b2','#065f46','#92400e','#be185d'];
function getColor(name = '') {
  let ci = 0;
  for (let i = 0; i < name.length; i++) ci = (ci + name.charCodeAt(i)) % COLORS.length;
  return COLORS[ci];
}
function Avatar({ name, size = 38 }) {
  const c = getColor(name);
  return (
    <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
         style={{ width: size, height: size, background: c, fontSize: size * 0.36 }}>
      {(name||'?').slice(0,2).toUpperCase()}
    </div>
  );
}

export default function ParticipantsPanel() {
  const {
    participants, localParticipant, myRole,
    speakerIds, handRaisedIds, activeSpeakerId,
    hostInviteToStage, hostRemoveFromStage,
    viewerCount, setActivePanel,
  } = useStream();

  const isHost = myRole === ROLE.HOST;

  const { onStage, audience } = useMemo(() => {
    const onStage  = [];
    const audience = [];

    // Local toujours en premier sur scène
    if (localParticipant) {
      const name = localParticipant.name || localParticipant.identity || '?';
      onStage.push({ p: localParticipant, name, isLocal: true, isHostP: myRole === ROLE.HOST });
    }

    participants.forEach((p) => {
      if (p.isLocal) return;
      const name    = p.name || p.identity || '?';
      const onS     = p.permissions?.canPublish || p.permissions?.roomAdmin;
      const isHostP = !!p.permissions?.roomAdmin;
      if (onS) onStage.push({ p, name, isLocal: false, isHostP });
      else     audience.push({ p, name, isLocal: false, isHostP: false });
    });

    return { onStage, audience };
  }, [participants, localParticipant, myRole]);

  return (
    <div className="flex flex-col h-full" style={{ background: '#0c1632' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <h3 className="text-white font-bold text-sm">Participants</h3>
          <p className="text-white/40 text-xs">{viewerCount} participant{viewerCount > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setActivePanel('members')}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Sur scène */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mb-2">
            Sur scène · {onStage.length}
          </p>
          {onStage.map(({ p, name, isLocal, isHostP }) => (
            <Row key={p.identity}
              name={name}
              label={isHostP ? '👑 Hôte' : isLocal && !isHostP ? '🎤 Vous' : '🎤 Orateur'}
              isLocal={isLocal}
              isSpeaking={p.identity === activeSpeakerId}
              isMuted={false}
              isOnStage
              canRemove={isHost && !isHostP && !isLocal}
              onRemove={() => hostRemoveFromStage(p.identity)}
            />
          ))}
        </div>

        <div className="mx-4 border-t border-white/8" />

        {/* Spectateurs */}
        <div className="px-4 pt-3 pb-2">
          <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mb-2">
            Spectateurs · {audience.length}
          </p>
          {audience.length === 0 && (
            <p className="text-white/25 text-xs py-3">Aucun spectateur</p>
          )}
          {audience.map(({ p, name }) => (
            <Row key={p.identity}
              name={name}
              hasHand={handRaisedIds.has(p.identity)}
              canInvite={isHost}
              onInvite={() => hostInviteToStage(p.identity)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ name, label, isLocal, isSpeaking, isOnStage, hasHand, canRemove, canInvite, onRemove, onInvite }) {
  return (
    <div className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-white/5 transition-colors group cursor-default">
      <div className="relative flex-shrink-0">
        <Avatar name={name} size={36} />
        {hasHand && (
          <span className="absolute -top-1 -right-1 text-xs">✋</span>
        )}
        {isOnStage && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-dark" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-white text-xs font-semibold truncate">{name}</p>
          {isLocal && <span className="text-blue-400 text-[10px] font-bold">Vous</span>}
        </div>
        {label && <p className="text-white/35 text-[10px]">{label}</p>}
        {hasHand && <p className="text-yellow-400 text-[10px] font-medium">Main levée</p>}
        {isSpeaking && <p className="text-green-400 text-[10px] font-medium animate-pulse">Parle…</p>}
      </div>

      {/* Actions hôte */}
      {canInvite && (
        <button onClick={onInvite} title="Inviter sur scène"
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1
                     px-2 py-1 rounded-lg text-[10px] font-bold text-accent-light"
          style={{ background: 'rgba(37,99,235,0.2)' }}>
          <UserPlus className="w-3 h-3" /> Inviter
        </button>
      )}
      {canRemove && (
        <button onClick={onRemove} title="Retirer de la scène"
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1
                     px-2 py-1 rounded-lg text-[10px] font-bold text-red-400"
          style={{ background: 'rgba(239,68,68,0.15)' }}>
          <UserMinus className="w-3 h-3" /> Retirer
        </button>
      )}
    </div>
  );
}