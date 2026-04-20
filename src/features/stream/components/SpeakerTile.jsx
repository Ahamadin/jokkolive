// src/features/stream/components/SpeakerTile.jsx
// Tuile vidéo 16:9 — attache les tracks immédiatement + re-attache si changement
import { useRef, useLayoutEffect, useEffect, useState, memo } from 'react';
import { Track } from 'livekit-client';
import { Mic, MicOff, Crown, Monitor } from 'lucide-react';

const COLORS = ['#1a2b5c','#2563eb','#7c3aed','#0891b2','#065f46','#92400e','#be185d'];
function getColor(name='') {
  let c=0; for(let i=0;i<name.length;i++) c=(c+name.charCodeAt(i))%COLORS.length; return COLORS[c];
}

const SpeakerTile = memo(function SpeakerTile({
  participant, isHost=false, isLocal=false,
  isActive=false, isSpeaking=false, isScreenShareTile=false,
}) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [isMuted,  setIsMuted]  = useState(false);

  const name     = participant?.name || participant?.identity || '?';
  const initials = name.slice(0,2).toUpperCase();
  const color    = getColor(name);

  // ── Attache les tracks au DOM ────────────────────────────
  useLayoutEffect(() => {
    if (!participant) return;

    const attach = () => {
      try {
        const pubs = Array.from(participant.getTrackPublications?.()?.values?.() || []);

        if (isScreenShareTile) {
          // Track partage écran
          const ssPub = pubs.find(p =>
            (p.source === Track.Source.ScreenShare || p.source === 'screen_share') &&
            p.kind === Track.Kind.Video
          );
          const active = ssPub && !ssPub.isMuted && ssPub.track;
          setHasVideo(!!active);
          if (active && videoRef.current) {
            ssPub.track.attach(videoRef.current);
          }
          return;
        }

        // Caméra
        const camPub = pubs.find(p =>
          p.source === Track.Source.Camera || p.source === 'camera'
        );
        const micPub = pubs.find(p =>
          p.source === Track.Source.Microphone || p.source === 'microphone'
        );

        const camOk = camPub && !camPub.isMuted && camPub.track;
        setHasVideo(!!camOk);

        if (camOk && videoRef.current) {
          camPub.track.attach(videoRef.current);
        }

        setIsMuted(!micPub || micPub.isMuted || !micPub.track);

        if (!isLocal && micPub?.track && audioRef.current) {
          micPub.track.attach(audioRef.current);
          audioRef.current.muted  = false;
          audioRef.current.volume = 1.0;
          audioRef.current.play().catch(() => {});
        }
      } catch(e) {
        console.warn('[SpeakerTile] attach error:', e);
      }
    };

    // Attacher immédiatement
    attach();

    // Re-attacher après 200ms, 600ms, 1500ms pour les tracks qui arrivent en retard
    const t1 = setTimeout(attach, 200);
    const t2 = setTimeout(attach, 600);
    const t3 = setTimeout(attach, 1500);

    // Écouter tous les événements de track
    const evts = [
      'trackSubscribed','trackUnsubscribed',
      'trackMuted','trackUnmuted',
      'trackPublished','trackUnpublished',
      'isSpeakingChanged',
    ];
    evts.forEach(e => participant.on?.(e, attach));

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      evts.forEach(e => participant.off?.(e, attach));
    };
  }, [participant, isLocal, isScreenShareTile]);

  // ── Surveiller si la vidéo perd sa source ───────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEmptied = () => setHasVideo(false);
    const onPlay    = () => setHasVideo(true);
    video.addEventListener('emptied', onEmptied);
    video.addEventListener('playing', onPlay);
    return () => {
      video.removeEventListener('emptied', onEmptied);
      video.removeEventListener('playing', onPlay);
    };
  }, []);

  return (
    <div style={{
      position:'relative', overflow:'hidden', borderRadius:12,
      width:'100%', height:'100%', background:'#0a0a0a',
      border: isSpeaking ? '2px solid #2563eb' : '2px solid rgba(255,255,255,0.07)',
      boxShadow: isSpeaking ? '0 0 0 2px rgba(37,99,235,0.25)' : 'none',
      transition:'border-color 0.2s, box-shadow 0.2s',
    }}>

      {/* Audio (remote seulement) */}
      {!isLocal && !isScreenShareTile && (
        <audio ref={audioRef} autoPlay playsInline style={{ display:'none' }} />
      )}

      {/* Vidéo */}
      <video
        ref={videoRef}
        autoPlay playsInline muted
        style={{
          position:'absolute', inset:0,
          width:'100%', height:'100%',
          objectFit: isScreenShareTile ? 'contain' : 'cover',
          opacity: hasVideo ? 1 : 0,
          transform: (isLocal && !isScreenShareTile) ? 'scaleX(-1)' : 'none',
          transition:'opacity 0.3s',
          background:'#000',
        }}
      />

      {/* Avatar si pas de vidéo */}
      {!hasVideo && (
        <div style={{
          position:'absolute', inset:0,
          display:'flex', alignItems:'center', justifyContent:'center',
          background: isScreenShareTile ? '#111' : getColor(name) + '15',
        }}>
          {isScreenShareTile
            ? <div style={{ textAlign:'center' }}>
                <Monitor size={40} color="rgba(255,255,255,0.2)" />
                <p style={{ color:'rgba(255,255,255,0.3)', fontSize:12, marginTop:8 }}>
                  Chargement partage écran…
                </p>
              </div>
            : <div style={{
                width:72, height:72, borderRadius:'50%', background:color,
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'#fff', fontWeight:800, fontSize:26,
              }}>
                {initials}
              </div>
          }
        </div>
      )}

      {/* Badge Hôte */}
      {isHost && !isScreenShareTile && (
        <div style={{ position:'absolute', top:10, left:10 }}>
          <span style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:99, fontSize:11, fontWeight:700, color:'#fbbf24', background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)' }}>
            <Crown size={11} /> Hôte
          </span>
        </div>
      )}

      {/* Badge Vous */}
      {isLocal && !isHost && !isScreenShareTile && (
        <div style={{ position:'absolute', top:10, left:10 }}>
          <span style={{ padding:'3px 8px', borderRadius:99, fontSize:11, fontWeight:700, color:'#60a5fa', background:'rgba(0,0,0,0.65)' }}>
            Vous
          </span>
        </div>
      )}

      {/* Badge PARLE — vert animé comme JokkoMeet */}
      {isSpeaking && !isScreenShareTile && (
        <div style={{
          position:'absolute', top:10,
          left: (isHost || isLocal) ? 76 : 10,
        }}>
          <span style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:99, fontSize:11, fontWeight:700, color:'#fff', background:'#16a34a' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#fff', display:'inline-block', animation:'pulse 1s infinite' }} />
            Parle
          </span>
        </div>
      )}

      {/* Badge partage écran */}
      {isScreenShareTile && (
        <div style={{ position:'absolute', top:10, left:10 }}>
          <span style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:99, fontSize:11, fontWeight:700, color:'#60a5fa', background:'rgba(0,0,0,0.65)' }}>
            <Monitor size={11} /> Écran de {name}
          </span>
        </div>
      )}

      {/* Barre bas : nom + micro */}
      {!isScreenShareTile && (
        <div style={{
          position:'absolute', bottom:0, left:0, right:0,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'8px 10px',
          background:'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
        }}>
          <p style={{ margin:0, color:'#fff', fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {name}
          </p>
          <div style={{ flexShrink:0, marginLeft:6 }}>
            {isMuted
              ? <div style={{ width:20, height:20, borderRadius:'50%', background:'rgba(239,68,68,0.85)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <MicOff size={11} color="#fff" />
                </div>
              : <Mic size={14} color="#4ade80" />
            }
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:0.5;transform:scale(0.8)}
        }
      `}</style>
    </div>
  );
});

export default SpeakerTile;