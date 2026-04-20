// src/features/stream/components/StreamControls.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, MicOff,
  Video, VideoOff,
  Monitor, MonitorX,
  Volume2, VolumeOff,
  Hand,
  Circle, Square,
  PhoneOff,
  MessageSquare,
  Users,
  FileText,
  BarChart2,
  Activity,
  Share2,
  Paperclip,
  Captions,
  Download,
  ChevronDown,
} from 'lucide-react';
import { useStream }          from '../context/StreamContext.jsx';
import { ROLE }               from '../../../config.js';

// ─────────────────────────────────────────────────────────────
// QR Code — canvas via API qrserver.com
// ─────────────────────────────────────────────────────────────
function useQRCanvas(text, size = 200) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !text) return;
    const canvas = canvasRef.current;
    const img    = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&bgcolor=0a1628&color=ffffff&margin=10&format=png`;
    img.onload = () => {
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0a1628'; ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
    };
    img.onerror = () => {
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0a1628'; ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
      ctx.fillText('QR non disponible', size / 2, size / 2 - 8);
      ctx.fillText('(réseau requis)',    size / 2, size / 2 + 10);
    };
  }, [text, size]);
  return canvasRef;
}

// ─────────────────────────────────────────────────────────────
// Modal Partager — lien /join/:room + QR code
// ─────────────────────────────────────────────────────────────
function ShareModal({ roomName, onClose }) {
  const joinUrl   = `${window.location.origin}/join/${roomName}`;
  const canvasRef = useQRCanvas(joinUrl, 200);
  const [copied,  setCopied] = useState(false);
  const [tab,     setTab]    = useState('link');

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(joinUrl).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }, [joinUrl]);

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) return;
    try { await navigator.share({ title: 'Rejoins mon live !', text: `Live ${roomName} sur JokkoLive`, url: joinUrl }); }
    catch {}
  }, [joinUrl, roomName]);

  const canNativeShare = typeof navigator.share === 'function';
  const T = (key) => ({
    flex:1, padding:'7px 4px', borderRadius:8, border:'none', cursor:'pointer',
    background: tab===key ? 'rgba(37,99,235,0.4)' : 'transparent',
    color:      tab===key ? '#fff' : 'rgba(255,255,255,0.4)',
    fontSize:11, fontWeight:700, transition:'all 0.15s',
  });

  return (
    <div style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#0a1628', borderRadius:20, border:'1px solid rgba(255,255,255,0.1)', padding:'22px 20px', maxWidth:380, width:'100%', boxShadow:'0 28px 72px rgba(0,0,0,0.7)', animation:'shareModalIn 0.18s cubic-bezier(0.34,1.56,0.64,1)', position:'relative' }}>

        <button onClick={onClose} style={{ position:'absolute', top:14, right:14, width:28, height:28, borderRadius:8, border:'none', background:'rgba(255,255,255,0.07)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" style={{width:14,height:14}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div style={{ marginBottom:16, paddingRight:32 }}>
          <p style={{ color:'#fff', fontWeight:800, fontSize:15, margin:'0 0 4px' }}>Partager le live</p>
          <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11, margin:0, lineHeight:1.5 }}>Le code est pré-rempli — seul le nom sera demandé.</p>
        </div>

        <div style={{ display:'flex', borderRadius:10, background:'rgba(255,255,255,0.05)', padding:3, gap:3, marginBottom:16 }}>
          <button style={T('link')} onClick={() => setTab('link')}>🔗 Lien</button>
          <button style={T('qr')}   onClick={() => setTab('qr')}>📱 QR Code</button>
        </div>

        {tab==='link' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ padding:'11px 13px', borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:10, margin:'0 0 4px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>Lien d'invitation</p>
              <p style={{ color:'#60a5fa', fontSize:12, margin:0, fontFamily:'monospace', wordBreak:'break-all', lineHeight:1.5 }}>{joinUrl}</p>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 13px', borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:10, margin:'0 0 2px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px' }}>Code du live</p>
                <p style={{ color:'#fff', fontFamily:'monospace', fontSize:16, fontWeight:800, letterSpacing:'0.15em', margin:0 }}>{roomName}</p>
              </div>
              <button onClick={handleCopy} style={{ padding:'7px 14px', borderRadius:9, border:'none', cursor:'pointer', background:copied?'rgba(34,197,94,0.2)':'rgba(255,255,255,0.1)', color:copied?'#4ade80':'rgba(255,255,255,0.7)', fontSize:11, fontWeight:700, transition:'all 0.15s' }}>
                {copied ? '✓ Copié !' : 'Copier le lien'}
              </button>
            </div>
            {canNativeShare && (
              <button onClick={handleNativeShare} style={{ width:'100%', padding:'12px', borderRadius:13, background:'rgba(37,99,235,0.15)', border:'1px solid rgba(37,99,235,0.3)', color:'#60a5fa', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <Share2 size={15}/> Partager via…
              </button>
            )}
          </div>
        )}

        {tab==='qr' && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
            <div style={{ padding:12, borderRadius:16, background:'#0a1628', border:'1px solid rgba(255,255,255,0.1)' }}>
              <canvas ref={canvasRef} width={200} height={200} style={{ display:'block', borderRadius:8 }}/>
            </div>
            <div style={{ textAlign:'center' }}>
              <p style={{ color:'rgba(255,255,255,0.7)', fontSize:12, fontWeight:700, margin:'0 0 4px' }}>Scanner avec un téléphone</p>
              <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11, margin:0, lineHeight:1.5 }}>Seul le nom sera demandé — le code est pré-rempli.</p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 16px', borderRadius:99, background:'rgba(37,99,235,0.12)', border:'1px solid rgba(37,99,235,0.25)' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#60a5fa', flexShrink:0 }}/>
              <span style={{ color:'#60a5fa', fontFamily:'monospace', fontSize:13, fontWeight:800, letterSpacing:'0.1em' }}>{roomName}</span>
            </div>
            <button onClick={handleCopy} style={{ padding:'9px 20px', borderRadius:11, background:copied?'rgba(34,197,94,0.2)':'rgba(255,255,255,0.08)', border:`1px solid ${copied?'rgba(34,197,94,0.35)':'rgba(255,255,255,0.12)'}`, color:copied?'#4ade80':'rgba(255,255,255,0.6)', fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.15s' }}>
              {copied ? "✓ Lien copié !" : "🔗 Copier le lien d'invitation"}
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes shareModalIn { from{opacity:0;transform:scale(0.93) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Bouton sous-titres avec sélecteur de langue
// ─────────────────────────────────────────────────────────────
function SubtitlesBtn({ enabled, isListening, isSpeaking, modelState, lang, langs, onToggle, onChangeLang }) {
  const [showMenu, setShowMenu] = useState(false);
  const [hover,    setHover]    = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    if (showMenu) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showMenu]);

  const bg          = enabled ? (hover?'rgba(37,99,235,0.45)':'rgba(37,99,235,0.28)') : (hover?'rgba(255,255,255,0.14)':'rgba(255,255,255,0.08)');
  const currentLang = (langs || WHISPER_LANGS).find(l => l.code === lang) || WHISPER_LANGS[0];
  const isLoading   = modelState === 'loading';
  const isReady     = modelState === 'ready';
  const isError     = modelState === 'error';

  return (
    <div ref={menuRef} style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', gap:3, flexShrink:0 }}>
      {showMenu && (
        <div style={{ position:'absolute', bottom:'calc(100% + 10px)', right:0, background:'#0f1d3e', border:'1px solid rgba(255,255,255,0.12)', borderRadius:14, overflow:'hidden', boxShadow:'0 16px 48px rgba(0,0,0,0.65)', zIndex:300, minWidth:180, animation:'ccMenuIn 0.16s cubic-bezier(.34,1.56,.64,1)' }}>
          <div style={{ padding:'10px 14px 7px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ margin:0, fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.6px' }}>Langue des sous-titres</p>
          </div>
          {(langs || WHISPER_LANGS).map(l => {
            const active = l.code === lang;
            return (
              <button key={l.code}
                onClick={() => { onChangeLang(l.code); setShowMenu(false); if (!enabled) onToggle(); }}
                style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'8px 14px', border:'none', background:active?'rgba(37,99,235,0.22)':'transparent', color:active?'#60a5fa':'rgba(255,255,255,0.72)', fontSize:13, fontWeight:active?700:500, cursor:'pointer', textAlign:'left', transition:'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = active?'rgba(37,99,235,0.32)':'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = active?'rgba(37,99,235,0.22)':'transparent'}
              >
                <span style={{ fontSize:18 }}>{l.flag}</span>
                <span>{l.label}</span>
                {active && <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{width:11,height:11,marginLeft:'auto'}}><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ position:'relative' }}>
        <button onClick={onToggle} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
          title={enabled?'Désactiver les sous-titres':'Activer les sous-titres (Whisper IA)'}
          style={{ width:44, height:44, borderRadius:12, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', background:isError?'rgba(239,68,68,0.2)':bg, transition:'background 0.15s', color:isError?'#f87171':enabled?'#60a5fa':'rgba(255,255,255,0.65)', position:'relative' }}
        >
          {isLoading ? <div style={{ width:17, height:17, border:'2px solid rgba(255,255,255,0.2)', borderTopColor:'#60a5fa', borderRadius:'50%', animation:'ccSpin 0.8s linear infinite' }}/> : <Captions size={17}/>}
          {enabled && isReady && isSpeaking   && <span style={{ position:'absolute', top:7, right:7, width:6, height:6, borderRadius:'50%', background:'#22c55e', animation:'ccDotPulse 0.7s infinite' }}/>}
          {enabled && isReady && isListening && !isSpeaking && <span style={{ position:'absolute', top:7, right:7, width:6, height:6, borderRadius:'50%', background:'#f59e0b', animation:'ccDotPulse 1.5s infinite' }}/>}
          {enabled && !isLoading && <span style={{ position:'absolute', bottom:4, right:4, fontSize:9, lineHeight:1 }}>{currentLang.flag}</span>}
        </button>
        <button onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }} title="Choisir la langue"
          style={{ position:'absolute', top:-5, right:-5, width:17, height:17, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.18)', background:showMenu?'#2563eb':'#111c3e', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s', zIndex:10 }}>
          <ChevronDown size={8} strokeWidth={3} color="rgba(255,255,255,0.7)"/>
        </button>
      </div>
      <span style={{ fontSize:10, fontWeight:500, whiteSpace:'nowrap', color:enabled?'#60a5fa':'rgba(255,255,255,0.38)' }}>
        {isLoading ? 'Chargement…' : enabled ? `CC · ${currentLang.flag}` : 'Sous-titres'}
      </span>
      <style>{`
        @keyframes ccMenuIn   { from{opacity:0;transform:scale(0.94) translateY(4px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes ccDotPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.5)} }
        @keyframes ccSpin     { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Bouton générique
// ─────────────────────────────────────────────────────────────
function Btn({ onClick, active, danger, warn, icon: Icon, iconSize=17, label, badge, disabled }) {
  const [hover, setHover] = useState(false);
  const bg = danger ? (hover?'#b91c1c':'#dc2626')
           : warn   ? 'rgba(239,68,68,0.2)'
           : active ? (hover?'rgba(255,255,255,0.28)':'rgba(255,255,255,0.22)')
           :          (hover?'rgba(255,255,255,0.14)':'rgba(255,255,255,0.08)');
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, flexShrink:0 }}>
      <button onClick={onClick} disabled={disabled} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{ width:44, height:44, borderRadius:12, border:'none', cursor:disabled?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', transition:'background 0.15s', background:bg, color:danger?'#fff':warn?'#fca5a5':active?'#fff':'rgba(255,255,255,0.65)', opacity:disabled?0.4:1, boxShadow:danger?'0 2px 14px rgba(220,38,38,0.45)':'none' }}>
        <Icon size={iconSize}/>
        {badge > 0 && (
          <span style={{ position:'absolute', top:-4, right:-4, minWidth:16, height:16, borderRadius:'50%', background:'#ef4444', color:'#fff', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px' }}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>
      {label && <span style={{ fontSize:10, color:'rgba(255,255,255,0.38)', fontWeight:500, whiteSpace:'nowrap' }}>{label}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Bouton Écran — avec indicateur son système capturé
// ─────────────────────────────────────────────────────────────
function ScreenShareBtn({ isActive, hasAudio, onClick }) {
  const [hover, setHover] = useState(false);
  const bg = isActive ? (hover?'rgba(255,255,255,0.28)':'rgba(255,255,255,0.22)') : (hover?'rgba(255,255,255,0.14)':'rgba(255,255,255,0.08)');

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, flexShrink:0 }}>
      <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        title={isActive ? "Arrêter le partage d'écran" : "Partager l'écran (résolution native + son système sur Chrome/Edge)"}
        style={{ width:44, height:44, borderRadius:12, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', transition:'background 0.15s', background:bg, color:isActive?'#fff':'rgba(255,255,255,0.65)' }}
      >
        {isActive ? <MonitorX size={17}/> : <Monitor size={17}/>}

        {/* 🔊 son système capturé */}
        {isActive && hasAudio && (
          <span style={{ position:'absolute', bottom:5, right:5, width:14, height:14, borderRadius:'50%', background:'rgba(34,197,94,0.9)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Volume2 size={8} color="#fff" strokeWidth={2.5}/>
          </span>
        )}
        {/* 🔇 son système non disponible */}
        {isActive && !hasAudio && (
          <span style={{ position:'absolute', bottom:5, right:5, width:14, height:14, borderRadius:'50%', background:'rgba(80,80,100,0.85)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <VolumeOff size={8} color="rgba(255,255,255,0.55)" strokeWidth={2.5}/>
          </span>
        )}
      </button>
      <span style={{ fontSize:10, color:'rgba(255,255,255,0.38)', fontWeight:500, whiteSpace:'nowrap' }}>
        {isActive ? (hasAudio ? 'Écran 🔊' : 'Écran') : 'Écran'}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Hook enregistrement local — MediaRecorder → fichier WebM
// L'utilisateur sélectionne ce qu'il veut capturer (onglet,
// fenêtre ou écran entier). Le fichier est téléchargé auto.
// ─────────────────────────────────────────────────────────────
function useLocalRecording() {
  const [isLocalRecording, setIsLocalRecording] = useState(false);
  const [isPreparing,      setIsPreparing]      = useState(false);
  const recorderRef  = useRef(null);
  const chunksRef    = useRef([]);
  const startTimeRef = useRef(null);

  const startLocalRec = useCallback(async () => {
    try {
      setIsPreparing(true);
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 },
        },
        audio: { echoCancellation: false, noiseSuppression: false },
        preferCurrentTab: true,
      });

      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];
      const mime     = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || '';
      const recorder = new MediaRecorder(displayStream, {
        mimeType: mime, videoBitsPerSecond: 4_000_000,
      });

      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        displayStream.getTracks().forEach(t => t.stop());
        const blob    = new Blob(chunksRef.current, { type: mime || 'video/webm' });
        const url     = URL.createObjectURL(blob);
        const a       = document.createElement('a');
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        a.href        = url;
        a.download    = `JokkoLive_${new Date().toISOString().slice(0,19).replace(/:/g,'-')}_${elapsed}s.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        chunksRef.current = [];
        setIsLocalRecording(false);
      };

      // Si l'utilisateur arrête via le contrôle navigateur
      displayStream.getVideoTracks()[0].onended = () => {
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      };

      recorder.start(1000);
      recorderRef.current  = recorder;
      startTimeRef.current = Date.now();
      setIsLocalRecording(true);
    } catch (err) {
      if (!err.message?.includes('Permission denied') && !err.message?.includes('Cancelled')) {
        console.warn('[LocalRec] Erreur:', err.message);
      }
    } finally {
      setIsPreparing(false);
    }
  }, []);

  const stopLocalRec = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    };
  }, []);

  return { isLocalRecording, isPreparing, startLocalRec, stopLocalRec };
}

export default function StreamControls({ onLeaveClick }) {
  const {
    myRole,
    isMicOn,         toggleMic,
    isCamOn,         toggleCam,
    isScreenSharing, toggleScreenShare,
    isRecording,     startRecording, stopRecording,
    raiseHand,       lowerHand,
    leaveStream,
    unreadChat,
    activePanel,     setActivePanel,
    roomName,        viewerCount,
  } = useStream();

  const [handUp,         setHandUp]        = useState(false);
  const { isLocalRecording, isPreparing, startLocalRec, stopLocalRec } = useLocalRecording();
  const [showShareModal, setShowShareModal] = useState(false);
  const [screenAudio,    setScreenAudio]    = useState(false);
  // Badge "nouveaux fichiers" — incrémenté à chaque stream:file_received quand panneau fermé
  const [unreadFiles,    setUnreadFiles]    = useState(0);

  const isOnStage = myRole === ROLE.HOST || myRole === ROLE.SPEAKER;
  const isHost    = myRole === ROLE.HOST;

  // ── Compter les fichiers non-lus ─────────────────────────────
  // On écoute le même event que FileViewerPanel
  // Quand le panneau fichiers est fermé, on incrémente le badge
  const activePanelRef = useRef(activePanel);
  useEffect(() => { activePanelRef.current = activePanel; }, [activePanel]);

  useEffect(() => {
    const handler = () => {
      if (activePanelRef.current !== 'files') {
        setUnreadFiles(n => n + 1);
      }
    };
    window.addEventListener('stream:file_received', handler);
    return () => window.removeEventListener('stream:file_received', handler);
  }, []);

  // Réinitialiser le badge quand on ouvre le panneau fichiers
  useEffect(() => {
    if (activePanel === 'files') setUnreadFiles(0);
  }, [activePanel]);

  // ── Sous-titres ─────────────────────────────────────────────
  
  // ── Partage d'écran — détection audio système ───────────────
  // toggleScreenShare dans StreamContext passe déjà audio:true
  // On détecte ici si le navigateur supporte l'audio système
  const handleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      setScreenAudio(false);
      await toggleScreenShare();
      return;
    }
    await toggleScreenShare();
    // Audio système : Chrome/Edge sur Windows ou ChromeOS (pas Safari/Firefox)
    const ua         = navigator.userAgent;
    const isChrome   = /Chrome\/(\d+)/.test(ua) && !/Edg\//.test(ua);
    const isEdge     = /Edg\//.test(ua);
    setScreenAudio(isChrome || isEdge);
  }, [isScreenSharing, toggleScreenShare]);

  const handleHand = async () => {
    if (handUp) { await lowerHand(); setHandUp(false); }
    else        { await raiseHand(); setHandUp(true); }
  };

  return (
    <div style={{ flexShrink:0, background:'#080f2a', borderTop:'1px solid rgba(255,255,255,0.07)', padding:'10px 20px 12px', display:'flex', alignItems:'center', gap:6 }}>

      {/* ── Gauche : badge LIVE + compteur ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, flex:'0 0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:99, background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)' }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#ef4444', display:'inline-block', animation:'ctrlPulse 1.2s infinite' }}/>
          <span style={{ color:'#f87171', fontSize:10, fontWeight:800, letterSpacing:'0.5px' }}>LIVE</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <Users size={12} color="rgba(255,255,255,0.35)"/>
          <span style={{ fontSize:12, color:'rgba(255,255,255,0.35)', fontWeight:600 }}>{viewerCount}</span>
        </div>
      </div>

      {/* ── Centre : contrôles principaux ── */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>

        {isOnStage && <Btn onClick={toggleMic} active={isMicOn} icon={isMicOn?Mic:MicOff} label={isMicOn?'Micro':'Muet'}/>}
        {isOnStage && <Btn onClick={toggleCam} active={isCamOn} icon={isCamOn?Video:VideoOff} label={isCamOn?'Caméra':'Off'}/>}

        {/* Écran — avec son système */}
        {isOnStage && (
          <ScreenShareBtn isActive={isScreenSharing} hasAudio={screenAudio} onClick={handleScreenShare}/>
        )}

        {myRole === ROLE.VIEWER && (
          <Btn onClick={handleHand} active={handUp} icon={Hand} label={handUp?'Baisser':'Main'}/>
        )}

        {isHost && (
          <Btn
            onClick={() => isRecording ? stopRecording() : startRecording()}
            active={isRecording} warn={isRecording}
            icon={isRecording ? Square : Circle}
            label={isRecording ? 'Stop Rec' : 'Enreg.'}
          />
        )}

        {/* ── Enregistrement local ── */}
        <Btn
          onClick={isLocalRecording ? stopLocalRec : startLocalRec}
          active={isLocalRecording}
          warn={isLocalRecording}
          disabled={isPreparing}
          icon={isLocalRecording ? Square : Circle}
          label={isPreparing ? 'Prépa…' : isLocalRecording ? 'Stop local' : 'Rec. local'}
        />

        <Btn onClick={onLeaveClick || leaveStream} danger icon={PhoneOff} label={isHost?'Terminer':'Quitter'}/>
      </div>

      {/* ── Droite : panneaux + sous-titres + partager ── */}
      <div style={{ display:'flex', alignItems:'center', gap:6, flex:'0 0 auto' }}>

        <Btn onClick={() => setActivePanel('chat')}
             active={activePanel==='chat'} icon={MessageSquare} label="Chat"
             badge={activePanel!=='chat' ? unreadChat : 0}/>

        <Btn onClick={() => setActivePanel('members')}
             active={activePanel==='members'} icon={Users} label="Membres"/>

        <Btn onClick={() => setActivePanel('notes')}
             active={activePanel==='notes'} icon={FileText} label="Notes"/>

        <Btn onClick={() => setActivePanel('poll')}
             active={activePanel==='poll'} icon={BarChart2} label="Sondage"/>

        {/* ── Fichiers partagés — badge quand nouveaux fichiers reçus ── */}
        <Btn
          onClick={() => setActivePanel('files')}
          active={activePanel==='files'} icon={Paperclip} label="Fichiers"
          badge={activePanel!=='files' ? unreadFiles : 0}
        />

        {/* ── Sous-titres CC ── */}
        {isHost && (
          <Btn onClick={() => setActivePanel('stats')}
               active={activePanel==='stats'} icon={Activity} label="Stats"/>
        )}

        <Btn onClick={() => setShowShareModal(true)} icon={Share2} label="Partager"/>
      </div>

      {/* Modal Partage */}
      {showShareModal && <ShareModal roomName={roomName} onClose={() => setShowShareModal(false)}/>}

      <style>{`@keyframes ctrlPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}