// src/features/stream/components/StageArea.jsx
// Plein écran sur N'IMPORTE quelle tuile (caméra OU partage écran)
// Double-clic ou bouton Maximize → fullscreen natif du navigateur
import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useStream } from '../context/StreamContext.jsx';
import { ROLE } from '../../../config.js';
import SpeakerTile from './SpeakerTile.jsx';
import { Tv2, Maximize2, Minimize2, X, Crown } from 'lucide-react';

// ── Modal plein écran universel ───────────────────────────────
// Partage écran en grand + caméra PiP en bas à droite (comme Twitch/YouTube)
// Caméra seule → plein écran simple
function FullscreenModal({ entry, speakerTiles, onClose }) {
  const containerRef = useRef(null);
  const [isNativeFs,   setIsNativeFs]   = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [pipHover,     setPipHover]     = useState(false);
  const hideTimer = useRef(null);

  const { participant, isLocal, isScreenShare, isHost, isSpeaking } = entry;
  const name = participant?.name || participant?.identity || '?';

  // Trouver la caméra de la personne qui partage (pour le PiP)
  const pipTile = isScreenShare
    ? speakerTiles.find(t => t.participant.identity === participant.identity) || null
    : null;

  // ── Plein écran natif ──────────────────────────────────────
  const enterNativeFs = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if      (el.requestFullscreen)         await el.requestFullscreen();
      else if (el.webkitRequestFullscreen)   el.webkitRequestFullscreen();
      else if (el.mozRequestFullScreen)      el.mozRequestFullScreen();
    } catch(e) { console.warn('FS:', e); }
  }, []);

  const exitNativeFs = useCallback(() => {
    try {
      if      (document.exitFullscreen)         document.exitFullscreen();
      else if (document.webkitExitFullscreen)   document.webkitExitFullscreen();
      else if (document.mozCancelFullScreen)    document.mozCancelFullScreen();
    } catch(e) {}
  }, []);

  // Sync état fullscreen natif
  useEffect(() => {
    const onChange = () => {
      const fs = !!(document.fullscreenElement ||
                    document.webkitFullscreenElement ||
                    document.mozFullScreenElement);
      setIsNativeFs(fs);
      if (!fs) onClose(); // ferme le modal quand on quitte le plein écran natif
    };
    document.addEventListener('fullscreenchange',       onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    document.addEventListener('mozfullscreenchange',    onChange);
    return () => {
      document.removeEventListener('fullscreenchange',       onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
      document.removeEventListener('mozfullscreenchange',    onChange);
    };
  }, [onClose]);

  // Echap → fermer
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Auto-hide contrôles après 3s
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => clearTimeout(hideTimer.current);
  }, [resetHideTimer]);

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
      onDoubleClick={() => isNativeFs ? exitNativeFs() : enterNativeFs()}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#000',
        display: 'flex', flexDirection: 'column',
        cursor: showControls ? 'default' : 'none',
      }}
    >
      {/* ── Barre contrôles top ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)',
        transition: 'opacity 0.3s',
        opacity: showControls ? 1 : 0,
        pointerEvents: showControls ? 'auto' : 'none',
      }}>
        {/* Titre */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {isHost && <Crown size={14} color="#fbbf24" />}
          <span style={{ color:'rgba(255,255,255,0.9)', fontSize:13, fontWeight:700 }}>
            {isScreenShare ? `🖥️ Écran de ${name}` : `📷 ${name}`}
          </span>
          {isSpeaking && (
            <span style={{ display:'flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:700, color:'#fff', background:'#16a34a' }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'#fff', display:'inline-block', animation:'fsPulse 1s infinite' }} />
              Parle
            </span>
          )}
          {isScreenShare && pipTile && (
            <span style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>
              · Caméra en incrustation
            </span>
          )}
        </div>

        {/* Boutons */}
        <div style={{ display:'flex', gap:8 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={isNativeFs ? exitNativeFs : enterNativeFs}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:10, border:'none', cursor:'pointer', background:'rgba(255,255,255,0.15)', backdropFilter:'blur(8px)', color:'#fff', fontSize:12, fontWeight:600 }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.28)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.15)'}
          >
            {isNativeFs ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}
            {isNativeFs ? 'Réduire' : 'Plein écran'}
          </button>
          <button
            onClick={() => { if (isNativeFs) exitNativeFs(); onClose(); }}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:10, border:'none', cursor:'pointer', background:'rgba(239,68,68,0.25)', backdropFilter:'blur(8px)', color:'#f87171', fontSize:12, fontWeight:700 }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.4)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.25)'}
          >
            <X size={14}/> Fermer
          </button>
        </div>
      </div>

      {/* ── Vidéo principale (partage écran OU caméra) ── */}
      <div style={{ position:'absolute', inset:0 }}>
        <SpeakerTile
          participant={participant}
          isHost={isHost}
          isLocal={isLocal}
          isScreenShareTile={isScreenShare}
          isSpeaking={isSpeaking}
        />
      </div>

      {/* ── PiP caméra — visible uniquement si partage d'écran ──
          Coin bas droite, draggable visuellement, avec hover effect   */}
      {isScreenShare && pipTile && (
        <div
          onClick={e => e.stopPropagation()}
          onMouseEnter={() => setPipHover(true)}
          onMouseLeave={() => setPipHover(false)}
          style={{
            position: 'absolute',
            bottom: 28, right: 24,
            zIndex: 30,
            width:  pipHover ? 260 : 220,
            height: pipHover ? 146 : 124,
            borderRadius: 14,
            overflow: 'hidden',
            border: pipHover
              ? '2px solid rgba(37,99,235,0.8)'
              : '2px solid rgba(255,255,255,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            transition: 'width 0.2s, height 0.2s, border-color 0.2s',
            cursor: 'default',
            background: '#000',
          }}
        >
          <SpeakerTile
            participant={pipTile.participant}
            isHost={pipTile.isHost}
            isLocal={pipTile.isLocal}
            isScreenShareTile={false}
            isSpeaking={isSpeaking}
          />
          {/* Badge PiP */}
          {pipHover && (
            <div style={{
              position:'absolute', top:6, left:6,
              padding:'2px 8px', borderRadius:99,
              background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)',
              color:'rgba(255,255,255,0.7)', fontSize:10, fontWeight:600,
            }}>
              📷 Caméra
            </div>
          )}
        </div>
      )}

      {/* Hint bas */}
      {showControls && !isNativeFs && (
        <div style={{ position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)', color:'rgba(255,255,255,0.25)', fontSize:11, pointerEvents:'none', whiteSpace:'nowrap' }}>
          Double-clic → plein écran natif · Échap → fermer
        </div>
      )}

      <style>{`
        @keyframes fsPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.8)}}
      `}</style>
    </div>
  );
}

// ── Bouton Maximize sur chaque tuile ─────────────────────────
function MaximizeBtn({ onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Plein écran"
      style={{
        position: 'absolute', bottom: 40, right: 10, zIndex: 5,
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
        background: hover ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.60)',
        backdropFilter: 'blur(8px)',
        color: '#fff', fontSize: 11, fontWeight: 700,
        transition: 'background 0.15s, opacity 0.15s',
        opacity: hover ? 1 : 0,
      }}
    >
      <Maximize2 size={12} /> Agrandir
    </button>
  );
}

// ── Wrapper tuile avec hover → show maximize btn ─────────────
function TileWrapper({ children, onMaximize, style }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{ position: 'relative', ...style }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDoubleClick={onMaximize}
    >
      {children}
      {/* Bouton agrandir visible au hover ou double-clic */}
      <button
        onClick={e => { e.stopPropagation(); onMaximize(); }}
        title="Agrandir (ou double-clic)"
        style={{
          position: 'absolute', bottom: 42, right: 10, zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 11px', borderRadius: 9, border: 'none', cursor: 'pointer',
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
          color: '#fff', fontSize: 11, fontWeight: 700,
          transition: 'opacity 0.2s',
          opacity: hover ? 1 : 0,
          pointerEvents: hover ? 'auto' : 'none',
        }}
      >
        <Maximize2 size={12} /> Agrandir
      </button>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────
export default function StageArea() {
  const {
    room, participants, localParticipant,
    myRole, activeSpeakerId, isScreenSharing,
  } = useStream();

  const [fsEntry, setFsEntry] = useState(null); // { participant, isLocal, isScreenShare, isHost, isSpeaking }

  const openFs = useCallback((entry) => setFsEntry(entry), []);
  const closeFs = useCallback(() => setFsEntry(null), []);

  // ── Construire les tuiles ─────────────────────────────────
  const { speakerTiles, screenShareTiles } = useMemo(() => {
    const speakers = [];
    const screens  = [];

    if (localParticipant && (myRole===ROLE.HOST || myRole===ROLE.SPEAKER)) {
      speakers.push({ participant:localParticipant, isHost:myRole===ROLE.HOST, isLocal:true });
    }

    participants.forEach(p => {
      if (p.isLocal) return;
      const onStage = p.permissions?.canPublish || p.permissions?.roomAdmin;
      if (!onStage) return;
      speakers.push({ participant:p, isHost:!!p.permissions?.roomAdmin, isLocal:false });
      const pubs = Array.from(p.getTrackPublications?.()?.values?.() || []);
      if (pubs.some(pub => (pub.source==='screen_share'||pub.source==='screen_share_audio') && !pub.isMuted && pub.track))
        screens.push({ participant:p, isLocal:false });
    });

    if (isScreenSharing && localParticipant)
      screens.push({ participant:localParticipant, isLocal:true });

    return { speakerTiles:speakers, screenShareTiles:screens };
  }, [participants, localParticipant, myRole, isScreenSharing]);

  // ── États vides ───────────────────────────────────────────
  if (!room) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'#000' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:36, height:36, border:'2px solid #2563eb', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
        <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13 }}>Connexion au live…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (speakerTiles.length === 0) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:'#000' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:72, height:72, borderRadius:20, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <Tv2 size={32} color="rgba(255,255,255,0.25)" />
        </div>
        <p style={{ color:'rgba(255,255,255,0.5)', fontWeight:600, margin:'0 0 6px' }}>Préparation du live…</p>
        <p style={{ color:'rgba(255,255,255,0.25)', fontSize:13 }}>L'hôte va démarrer dans un instant</p>
      </div>
    </div>
  );

  const hasScreenShare = screenShareTiles.length > 0;
  const count = speakerTiles.length;

  return (
    <>
      {/* ── Modal plein écran (caméra OU partage écran + PiP) ── */}
      {fsEntry && (
        <FullscreenModal entry={fsEntry} speakerTiles={speakerTiles} onClose={closeFs} />
      )}

      {/* ── Layout partage d'écran ── */}
      {hasScreenShare && (
        <div style={{ flex:1, display:'flex', overflow:'hidden', background:'#000', gap:2, padding:2 }}>
          {/* Grand écran partage d'écran */}
          <TileWrapper
            style={{ flex:1, minWidth:0 }}
            onMaximize={() => openFs({
              participant: screenShareTiles[0].participant,
              isLocal:     screenShareTiles[0].isLocal,
              isScreenShare: true,
              isHost:      false,
              isSpeaking:  screenShareTiles[0].participant.identity === activeSpeakerId,
            })}
          >
            <SpeakerTile
              participant={screenShareTiles[0].participant}
              isLocal={screenShareTiles[0].isLocal}
              isScreenShareTile
              isSpeaking={screenShareTiles[0].participant.identity === activeSpeakerId}
            />
          </TileWrapper>

          {/* Bande droite — caméras avec bouton agrandir */}
          <div style={{ display:'flex', flexDirection:'column', gap:2, width:172, flexShrink:0, overflowY:'auto' }}>
            {speakerTiles.map(({ participant, isHost, isLocal }) => (
              <TileWrapper
                key={participant.identity}
                style={{ height:105, flexShrink:0 }}
                onMaximize={() => openFs({
                  participant, isLocal, isScreenShare:false, isHost,
                  isSpeaking: participant.identity === activeSpeakerId,
                })}
              >
                <SpeakerTile
                  participant={participant} isHost={isHost} isLocal={isLocal}
                  isSpeaking={participant.identity === activeSpeakerId}
                />
              </TileWrapper>
            ))}
          </div>
        </div>
      )}

      {/* ── 1 speaker seul ── */}
      {!hasScreenShare && count === 1 && (
        <TileWrapper
          style={{ flex:1, overflow:'hidden', background:'#000', padding:2 }}
          onMaximize={() => openFs({
            participant: speakerTiles[0].participant,
            isLocal:     speakerTiles[0].isLocal,
            isHost:      speakerTiles[0].isHost,
            isScreenShare: false,
            isSpeaking:  speakerTiles[0].participant.identity === activeSpeakerId,
          })}
        >
          <SpeakerTile {...speakerTiles[0]} isSpeaking={speakerTiles[0].participant.identity === activeSpeakerId} />
        </TileWrapper>
      )}

      {/* ── 2 côte à côte ── */}
      {!hasScreenShare && count === 2 && (
        <div style={{ flex:1, display:'flex', overflow:'hidden', background:'#000', gap:2, padding:2 }}>
          {speakerTiles.map(({ participant, isHost, isLocal }) => (
            <TileWrapper
              key={participant.identity}
              style={{ flex:1, minWidth:0 }}
              onMaximize={() => openFs({ participant, isLocal, isHost, isScreenShare:false, isSpeaking: participant.identity === activeSpeakerId })}
            >
              <SpeakerTile participant={participant} isHost={isHost} isLocal={isLocal} isSpeaking={participant.identity === activeSpeakerId} />
            </TileWrapper>
          ))}
        </div>
      )}

      {/* ── 3+ grille ── */}
      {!hasScreenShare && count >= 3 && (
        <div style={{ flex:1, overflow:'hidden', background:'#000', padding:2 }}>
          <div style={{ height:'100%', display:'grid', gap:2, gridTemplateColumns:`repeat(${count<=4?2:3}, minmax(0,1fr))` }}>
            {speakerTiles.map(({ participant, isHost, isLocal }) => (
              <TileWrapper
                key={participant.identity}
                style={{}}
                onMaximize={() => openFs({ participant, isLocal, isHost, isScreenShare:false, isSpeaking: participant.identity === activeSpeakerId })}
              >
                <SpeakerTile participant={participant} isHost={isHost} isLocal={isLocal} isSpeaking={participant.identity === activeSpeakerId} />
              </TileWrapper>
            ))}
          </div>
        </div>
      )}
    </>
  );
}