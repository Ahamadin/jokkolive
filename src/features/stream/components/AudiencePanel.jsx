// src/features/stream/components/StageArea.jsx
import { useMemo } from 'react';
import { useStream } from '../context/StreamContext.jsx';
import { ROLE } from '../../../config.js';
import SpeakerTile from './SpeakerTile.jsx';
import { Tv2 } from 'lucide-react';

export default function StageArea() {
  const {
    room, participants, localParticipant,
    myRole, speakerIds, activeSpeakerId,
  } = useStream();

  // ── Construire la liste des orateurs sur scène ───────────
  const stageTiles = useMemo(() => {
    const tiles = [];

    // L'hôte est toujours sur scène
    if (localParticipant && myRole === ROLE.HOST) {
      tiles.push({ participant: localParticipant, isHost: true, isLocal: true });
    }

    // Remote participants avec canPublish
    participants.forEach((p, id) => {
      if (p.isLocal) return;
      const isHostRemote = p.permissions?.roomAdmin;
      if (p.permissions?.canPublish || isHostRemote) {
        tiles.push({ participant: p, isHost: isHostRemote, isLocal: false });
      }
    });

    // Moi-même si je suis speaker (pas host)
    if (localParticipant && myRole === ROLE.SPEAKER) {
      if (!tiles.find(t => t.participant.identity === localParticipant.identity)) {
        tiles.push({ participant: localParticipant, isHost: false, isLocal: true });
      }
    }

    return tiles;
  }, [participants, localParticipant, myRole, speakerIds]);

  // ── Pas encore connecté ──────────────────────────────────
  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white/40 text-sm">Connexion au live…</p>
        </div>
      </div>
    );
  }

  // ── Stream vide / en attente ─────────────────────────────
  if (stageTiles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
            <Tv2 className="w-9 h-9 text-white/30" />
          </div>
          <p className="text-white/50 font-semibold">Préparation du live…</p>
          <p className="text-white/25 text-sm mt-1">L'hôte va démarrer dans un instant</p>
        </div>
      </div>
    );
  }

  // ── Layout adaptatif ─────────────────────────────────────
  const count = stageTiles.length;
  const cols  = count === 1 ? 1 : count <= 4 ? 2 : 3;

  return (
    <div className="flex-1 p-3 overflow-hidden">
      <div
        className="h-full grid gap-3 content-center"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {stageTiles.map(({ participant, isHost, isLocal }) => (
          <SpeakerTile
            key={participant.identity}
            participant={participant}
            isHost={isHost}
            isLocal={isLocal}
            isActive={participant.identity === activeSpeakerId}
          />
        ))}
      </div>
    </div>
  );
}