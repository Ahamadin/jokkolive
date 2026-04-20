// src/routes/Stream.jsx
//
// Gestion fermeture onglet / navigateur :
//   → beforeunload    : déclenche leaveStream('close') en synchrone via sendBeacon
//   → visibilitychange: si l'onglet devient hidden de façon permanente (ex : mobile)
//     on ne déclenche PAS immédiatement (l'utilisateur peut revenir),
//     mais si document.visibilityState passe à hidden + pagehide → on quitte
//
// Comportement :
//   • Hôte ferme l'onglet    → sendBeacon /api/stream/end → même effet que "Terminer"
//   • Spectateur ferme       → disconnect simple
//   • Navigation React (SPA) → PAS déclenché (pas de rechargement de page)
//   • Refresh (F5)           → DÉCLENCHÉ (beforeunload se déclenche sur refresh)
//     Pour éviter ça, on désactive sur pagehide si persisted = true (bfcache)

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate }     from 'react-router-dom';
import { StreamProvider }    from '../features/stream/context/StreamContext.jsx';
import StreamHeader          from '../features/stream/components/StreamHeader.jsx';
import StageArea             from '../features/stream/components/StageArea.jsx';
import ChatPanel             from '../features/stream/components/ChatPanel.jsx';
import ParticipantsPanel     from '../features/stream/components/ParticipantsPanel.jsx';
import NotesPanel            from '../features/stream/components/NotesPanel.jsx';
import PollPanel             from '../features/stream/components/PollPanel.jsx';
import StreamStatsPanel      from '../features/stream/components/StreamStatsPanel.jsx';
import StreamControls        from '../features/stream/components/StreamControls.jsx';
import ReactionsOverlay      from '../features/stream/components/ReactionsOverlay.jsx';
import StageInviteModal      from '../features/stream/components/StageInviteModal.jsx';
import HandRaisedToast       from '../features/stream/components/HandRaisedToast.jsx';
import StreamAnnouncer       from '../features/stream/components/StreamAnnouncer.jsx';
import LeaveConfirmModal     from '../features/stream/components/LeaveConfirmModal.jsx';
import LiveSubtitles         from '../features/stream/components/LiveSubtitles.jsx';
import { useStream }         from '../features/stream/context/StreamContext.jsx';
import { useStreamAnnouncer} from '../features/stream/hooks/useStreamAnnouncer.js';

export default function Stream() {
  const { room } = useParams();
  const navigate  = useNavigate();
  const [session, setSession] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(`stream_${room}`);
    if (!raw) { navigate('/'); return; }
    try {
      const data = JSON.parse(raw);
      if (!data.token) { navigate('/'); return; }
      setSession(data);
    } catch { navigate('/'); }
  }, [room, navigate]);

  if (!session) {
    return (
      <div style={{minHeight:'100vh',background:'#080f2a',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{textAlign:'center'}}>
          <div style={{width:36,height:36,border:'2px solid #2563eb',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 12px'}}/>
          <p style={{color:'rgba(255,255,255,0.4)',fontSize:13}}>Chargement…</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <StreamProvider
      initToken={session.token}
      initRole={session.role}
      initName={session.displayName}
      roomName={room}
      wsUrl={session.wsUrl}
    >
      <StreamLayout roomName={room} />
    </StreamProvider>
  );
}

// ── Layout principal ──────────────────────────────────────────
function StreamLayout({ roomName }) {
  const {
    activePanel, setActivePanel,
    error, isLive,
    myRole, displayName,
    leaveStream,
  } = useStream();

  const [showLeave, setShowLeave] = useState(false);
  const [subtitles, setSubtitles] = useState({
    enabled: false, transcript: '', isListening: false,
    isSpeaking: false, modelState: 'idle', modelProgress: 0,
  });

  // Ref pour accéder aux valeurs les plus récentes dans les event listeners
  const leaveStreamRef = useRef(leaveStream);
  const myRoleRef      = useRef(myRole);
  const displayNameRef = useRef(displayName);
  const roomNameRef    = useRef(roomName);
  // Flag pour éviter double déclenchement (beforeunload + pagehide)
  const hasLeftRef     = useRef(false);

  useEffect(() => { leaveStreamRef.current  = leaveStream;  }, [leaveStream]);
  useEffect(() => { myRoleRef.current       = myRole;       }, [myRole]);
  useEffect(() => { displayNameRef.current  = displayName;  }, [displayName]);

  const handleSubtitlesChange = useCallback((s) => setSubtitles(s), []);
  useStreamAnnouncer();

  // ── Gestion fermeture onglet ──────────────────────────────────
  // beforeunload : se déclenche sur F5, fermeture onglet, fermeture navigateur
  // pagehide     : se déclenche quand la page est réellement déchargée
  //   → event.persisted = true  : mise en bfcache (tab switch, back/forward) → on ne quitte PAS
  //   → event.persisted = false : déchargement réel → on quitte
  useEffect(() => {
    // Prépare la redirection Home en sessionStorage avant de partir
    // (le navigate React ne fonctionnera pas après fermeture)
    const prepareSessionForLeave = (mode) => {
      const name    = displayNameRef.current || '';
      const role    = myRoleRef.current;
      const room    = roomNameRef.current;
      const isHost  = role === 'host';

      sessionStorage.setItem('stream_last_name', name);

      if (isHost && mode === 'close') {
        // Hôte ferme → on marque comme "en pause" pour la bannière de reprise
        // (l'hôte pourrait vouloir reprendre si c'était un accident)
        sessionStorage.setItem(`stream_host_paused_${room}`, '1');
        sessionStorage.setItem('stream_tab_closed_as_host', room);
      } else if (!isHost) {
        sessionStorage.setItem('stream_last_room', room);
      }
    };

    const handlePageHide = (e) => {
      if (e.persisted) return; // bfcache — page conservée en mémoire, pas un vrai départ
      if (hasLeftRef.current) return;
      hasLeftRef.current = true;
      prepareSessionForLeave('close');
      leaveStreamRef.current('close');
    };

    const handleBeforeUnload = () => {
      // beforeunload se déclenche AVANT pagehide
      // On prépare juste le sessionStorage ici, le leaveStream('close') sera fait dans pagehide
      // (pour éviter double appel)
      prepareSessionForLeave('close');
    };

    window.addEventListener('pagehide',      handlePageHide);
    window.addEventListener('beforeunload',  handleBeforeUnload);

    return () => {
      window.removeEventListener('pagehide',     handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // eslint-disable-line

  // Reset le flag hasLeft quand le composant re-monte (reconnexion SPA)
  useEffect(() => {
    hasLeftRef.current = false;
  }, []);

  // ── Écran stream terminé (reçu via MSG.STREAM_ENDED) ─────────
  if (error && !isLive) {
    return (
      <div style={{height:'100vh',background:'#080f2a',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{textAlign:'center',background:'#0f1d3e',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:'40px 32px',maxWidth:360}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{width:48,height:48,margin:'0 auto 16px',display:'block'}}>
            <path d="M8.56 2.9A7 7 0 0 1 19 9v4"/><path d="M17 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1"/>
            <path d="M6 17v1a1 1 0 0 0 1 1h4"/><line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
          <p style={{color:'#fff',fontWeight:700,fontSize:17,margin:'0 0 8px'}}>Stream terminé</p>
          <p style={{color:'rgba(255,255,255,0.45)',fontSize:13,margin:'0 0 24px'}}>{error}</p>
          <a href="/" style={{display:'inline-block',padding:'10px 24px',borderRadius:12,background:'#2563eb',color:'#fff',fontWeight:700,fontSize:13,textDecoration:'none'}}>
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{height:'100vh',background:'#080f2a',display:'flex',flexDirection:'column',overflow:'hidden'}}>

      <StreamHeader/>

      <div style={{display:'flex',flex:1,minHeight:0,overflow:'hidden'}}>

        {/* Scène + overlays */}
        <div style={{display:'flex',flexDirection:'column',flex:1,minWidth:0,position:'relative',overflow:'hidden'}}>
          <StageArea/>
          <ReactionsOverlay/>
          <HandRaisedToast/>
          <StreamAnnouncer/>
          {(subtitles.enabled || subtitles.modelState === 'loading') && (
            <LiveSubtitles
              transcript={subtitles.transcript}
              isSpeaking={subtitles.isSpeaking}
              modelState={subtitles.modelState}
              modelProgress={subtitles.modelProgress}
            />
          )}
        </div>

        {/* Sidebar droite */}
        {activePanel && (
          <div style={{
            width:320, flexShrink:0, display:'flex', flexDirection:'column',
            borderLeft:'1px solid rgba(255,255,255,0.07)',
            background:'#0c1632', animation:'slideInRight 0.2s ease',
          }}>
            {activePanel === 'chat'    && <ChatPanel/>}
            {activePanel === 'members' && <ParticipantsPanel/>}
            {activePanel === 'notes'   && <NotesPanel/>}
            {activePanel === 'poll'    && <PollPanel/>}
            {activePanel === 'stats'   && <StreamStatsPanel onClose={() => setActivePanel('stats')}/>}
          </div>
        )}
      </div>

      <StreamControls
        onLeaveClick={() => setShowLeave(true)}
      />

      <StageInviteModal/>
      {showLeave && <LeaveConfirmModal onClose={() => setShowLeave(false)}/>}

      <style>{`
        @keyframes slideInRight {
          from { transform:translateX(20px); opacity:0; }
          to   { transform:translateX(0);    opacity:1; }
        }
      `}</style>
    </div>
  );
}