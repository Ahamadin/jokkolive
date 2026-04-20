// src/routes/Home.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Radio, Users, ArrowRight, Tv2, Loader2, RefreshCw, Shuffle, Edit3 } from 'lucide-react';
import { createStream, joinStream } from '../api/stream.js';

// ── Génère un code de room lisible (format XXXX-XXXX) ────────
function genRoomCode() {
  const seg = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${seg()}-${seg()}`;
}

// ── Valide un nom de room personnalisé ────────────────────────
// Autorisé : lettres, chiffres, tirets, underscores, espaces → convertis en tirets
// Min 3 chars, max 32 chars
function sanitizeCustomRoom(val) {
  return val
    .replace(/[^a-zA-Z0-9\s\-_]/g, '') // garder lettres, chiffres, espaces, tirets
    .replace(/\s+/g, '-')               // espaces → tirets
    .toUpperCase()
    .slice(0, 32);
}

function isValidRoomName(val) {
  const clean = val.trim();
  return clean.length >= 3 && /^[A-Z0-9][A-Z0-9\-_]*[A-Z0-9]$/.test(clean);
}

export default function Home() {
  const navigate   = useNavigate();
  const [sp]       = useSearchParams();

  // ── États ────────────────────────────────────────────────────
  const [name,     setName]     = useState(() => sp.get('name') || sessionStorage.getItem('stream_last_name') || '');
  const [room,     setRoom]     = useState(() => sp.get('room') || sessionStorage.getItem('stream_last_room') || '');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // Mode de code pour l'hôte : 'auto' = généré | 'custom' = personnalisé
  const [codeMode,     setCodeMode]     = useState('auto');
  const [customRoom,   setCustomRoom]   = useState('');
  const [autoRoomCode, setAutoRoomCode] = useState(() => genRoomCode());

  // Onglet actif — forcé par ?tab= si présent
  const tabParam = sp.get('tab');
  const [tab, setTab] = useState(() => {
    if (tabParam === 'host')   return 'host';
    if (tabParam === 'viewer') return 'viewer';
    // Pas de param → logique existante
    const lastRoom = sp.get('room') || sessionStorage.getItem('stream_last_room');
    return lastRoom ? 'viewer' : 'host';
  });

  // ── Bannière reprise hôte ────────────────────────────────────
  const hostRejoinCode = sp.get('host_rejoin');
  const isPausedHost   = hostRejoinCode
    && sessionStorage.getItem(`stream_host_paused_${hostRejoinCode}`) === '1';

  useEffect(() => {
    if (isPausedHost) setTab('host');
  }, []); // eslint-disable-line

  // ── Code effectif à utiliser pour créer le live ──────────────
  const effectiveRoomCode = codeMode === 'custom'
    ? sanitizeCustomRoom(customRoom)
    : autoRoomCode;

  // ── Régénérer le code auto ────────────────────────────────────
  const handleRegen = useCallback(() => {
    setAutoRoomCode(genRoomCode());
  }, []);

  // ── Créer un nouveau live (hôte) ─────────────────────────────
  const handleHost = async () => {
    if (!name.trim()) return setError('Entre ton nom d\'affichage');

    if (codeMode === 'custom') {
      const clean = sanitizeCustomRoom(customRoom);
      if (!isValidRoomName(clean)) {
        return setError('Nom de live invalide — min 3 caractères, lettres et chiffres uniquement');
      }
    }

    setError(''); setLoading(true);
    try {
      const roomCode = effectiveRoomCode;
      const data     = await createStream(name.trim(), roomCode);
      sessionStorage.setItem(`stream_${roomCode}`, JSON.stringify({
        token: data.token, role: 'host', displayName: name.trim(), wsUrl: data.wsUrl,
      }));
      navigate(`/stream/${roomCode}`);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── Rejoindre un live (spectateur) ───────────────────────────
  const handleJoin = async () => {
    if (!name.trim()) return setError('Entre ton nom d\'affichage');
    if (!room.trim()) return setError('Entre le code du stream');
    setError(''); setLoading(true);
    try {
      const roomCode = room.trim().toUpperCase();
      const data     = await joinStream(name.trim(), roomCode);
      sessionStorage.setItem(`stream_${roomCode}`, JSON.stringify({
        token: data.token, role: 'viewer', displayName: name.trim(), wsUrl: data.wsUrl,
      }));
      navigate(`/stream/${roomCode}`);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── Reprendre le live après pause ────────────────────────────
  const handleRejoinAsHost = async (roomCode) => {
    if (!name.trim()) return setError('Entre ton nom d\'affichage');
    setError(''); setLoading(true);
    try {
      const data = await createStream(name.trim(), roomCode);
      sessionStorage.setItem(`stream_${roomCode}`, JSON.stringify({
        token: data.token, role: 'host', displayName: name.trim(), wsUrl: data.wsUrl,
      }));
      sessionStorage.removeItem(`stream_host_paused_${roomCode}`);
      navigate(`/stream/${roomCode}`);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleDismissPause = () => {
    if (hostRejoinCode) {
      sessionStorage.removeItem(`stream_host_paused_${hostRejoinCode}`);
      sessionStorage.removeItem('stream_last_room');
    }
    setError('');
    navigate('/', { replace: true });
  };

  // ── Aperçu du code final (pour le tooltip / preview) ─────────
  const codePreview = codeMode === 'custom'
    ? (sanitizeCustomRoom(customRoom) || '…')
    : autoRoomCode;

  return (
    <div className="min-h-screen stream-bg flex flex-col items-center justify-center px-4">

      {/* ── Logo ── */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <img
            src="/senegal.jpg"
            alt="Logo"
            style={{ width: '50px', height: '50px', borderRadius: '10px', objectFit: 'contain', background: '#fff', flexShrink: 0 }}
          />
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Di<span className="text-live">soo</span>
          </h1>
        </div>
        <p className="text-white/40 text-sm">Diffusion en direct · Latence &lt; 100ms</p>
      </div>

      {/* ── Bannière reprise hôte ── */}
      {isPausedHost && (
        <div style={{
          width:'100%', maxWidth:448, marginBottom:16,
          borderRadius:16, overflow:'hidden',
          border:'1px solid rgba(37,99,235,0.35)',
          background:'rgba(37,99,235,0.1)',
          backdropFilter:'blur(8px)',
        }}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',borderBottom:'1px solid rgba(37,99,235,0.2)'}}>
            <div style={{width:32,height:32,borderRadius:8,background:'rgba(37,99,235,0.25)',border:'1px solid rgba(37,99,235,0.4)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <span style={{width:10,height:10,borderRadius:'50%',background:'#ef4444',display:'block',animation:'livePulse 1.5s ease-in-out infinite'}}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <p style={{color:'#fff',fontWeight:700,fontSize:13,margin:0}}>Live en pause</p>
              <p style={{color:'rgba(255,255,255,0.45)',fontSize:11,margin:0}}>Ton live est toujours actif · les spectateurs attendent</p>
            </div>
            <span style={{fontFamily:'monospace',fontSize:12,fontWeight:800,color:'#60a5fa',letterSpacing:'1px',background:'rgba(37,99,235,0.2)',padding:'3px 10px',borderRadius:99,border:'1px solid rgba(37,99,235,0.3)',flexShrink:0}}>
              {hostRejoinCode}
            </span>
          </div>
          <div style={{display:'flex',gap:8,padding:'12px 16px'}}>
            <button
              onClick={() => handleRejoinAsHost(hostRejoinCode)}
              disabled={loading || !name.trim()}
              style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'10px 14px',borderRadius:11,border:'none',background:loading?'#1e40af':'#2563eb',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',opacity:(!name.trim()&&!loading)?0.5:1,transition:'background 0.15s, opacity 0.15s',boxShadow:'0 4px 16px rgba(37,99,235,0.35)'}}
              onMouseEnter={e=>{if(!loading&&name.trim())e.currentTarget.style.background='#1d4ed8';}}
              onMouseLeave={e=>{e.currentTarget.style.background=loading?'#1e40af':'#2563eb';}}
            >
              {loading
                ? <><Loader2 style={{width:14,height:14,animation:'spin 1s linear infinite'}}/> Connexion…</>
                : <><RefreshCw style={{width:14,height:14}}/> Reprendre le live</>
              }
            </button>
            <button onClick={handleDismissPause} disabled={loading}
              style={{padding:'10px 14px',borderRadius:11,border:'1px solid rgba(255,255,255,0.1)',background:'transparent',color:'rgba(255,255,255,0.45)',fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
              Ignorer
            </button>
          </div>
          {!name.trim() && (
            <p style={{color:'#fbbf24',fontSize:11,textAlign:'center',padding:'0 16px 10px',margin:0}}>
              ↑ Entre ton nom ci-dessous pour reprendre
            </p>
          )}
        </div>
      )}

      {/* ── Card principale ── */}
      <div className="stream-card rounded-2xl w-full max-w-md p-6 shadow-heavy">

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden mb-6" style={{background:'rgba(255,255,255,0.05)'}}>
          {[
            { key:'host',   icon:Radio,  label:'Démarrer un live' },
            { key:'viewer', icon:Users,  label:'Rejoindre un live' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setError(''); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all"
              style={{
                background:   tab === key ? (key==='host'?'#ef4444':'#2563eb') : 'transparent',
                color:        tab === key ? '#fff' : 'rgba(255,255,255,0.45)',
                borderRadius: 10,
              }}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Champ nom */}
        <div className="mb-4">
          <label className="block text-white/50 text-xs font-semibold mb-1.5 uppercase tracking-wide">
            Ton nom
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex : Ahamadi NASRY"
            className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all"
            style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)'}}
            onFocus={e => e.target.style.borderColor='rgba(37,99,235,0.5)'}
            onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.12)'}
          />
        </div>

        {/* ── Onglet HÔTE : choix du code de live ── */}
        {tab === 'host' && (
          <div className="mb-4">
            <label className="block text-white/50 text-xs font-semibold mb-2 uppercase tracking-wide">
              Code du live
            </label>

            {/* Sélecteur mode */}
            <div style={{display:'flex',borderRadius:10,background:'rgba(255,255,255,0.05)',padding:3,gap:3,marginBottom:12}}>
              <button
                onClick={() => setCodeMode('auto')}
                style={{
                  flex:1, padding:'7px 8px', borderRadius:8, border:'none', cursor:'pointer',
                  background: codeMode==='auto' ? 'rgba(239,68,68,0.35)' : 'transparent',
                  color: codeMode==='auto' ? '#fff' : 'rgba(255,255,255,0.4)',
                  fontSize:11, fontWeight:700, display:'flex', alignItems:'center',
                  justifyContent:'center', gap:5, transition:'all 0.15s',
                }}
              >
                <Shuffle style={{width:11,height:11}}/> Auto-généré
              </button>
              <button
                onClick={() => setCodeMode('custom')}
                style={{
                  flex:1, padding:'7px 8px', borderRadius:8, border:'none', cursor:'pointer',
                  background: codeMode==='custom' ? 'rgba(239,68,68,0.35)' : 'transparent',
                  color: codeMode==='custom' ? '#fff' : 'rgba(255,255,255,0.4)',
                  fontSize:11, fontWeight:700, display:'flex', alignItems:'center',
                  justifyContent:'center', gap:5, transition:'all 0.15s',
                }}
              >
                <Edit3 style={{width:11,height:11}}/> Personnalisé
              </button>
            </div>

            {/* Mode auto — affiche le code + bouton régénérer */}
            {codeMode === 'auto' && (
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{
                  flex:1, display:'flex', alignItems:'center',
                  background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
                  borderRadius:12, padding:'10px 14px', gap:10,
                }}>
                  <span style={{
                    fontFamily:'monospace', fontSize:16, fontWeight:800,
                    color:'#fff', letterSpacing:'0.15em', flex:1, textAlign:'center',
                  }}>
                    {autoRoomCode}
                  </span>
                </div>
                <button
                  onClick={handleRegen}
                  title="Générer un nouveau code"
                  style={{
                    width:44, height:44, borderRadius:12, border:'1px solid rgba(255,255,255,0.12)',
                    background:'rgba(255,255,255,0.06)', cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'rgba(255,255,255,0.6)', flexShrink:0, transition:'all 0.15s',
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.12)';e.currentTarget.style.color='#fff';}}
                  onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.06)';e.currentTarget.style.color='rgba(255,255,255,0.6)';}}
                >
                  <Shuffle style={{width:16,height:16}}/>
                </button>
              </div>
            )}

            {/* Mode custom — champ de saisie + preview */}
            {codeMode === 'custom' && (
              <div>
                <input
                  value={customRoom}
                  onChange={e => setCustomRoom(sanitizeCustomRoom(e.target.value))}
                  placeholder="Ex : RTN, MON-LIVE, DEBAT2025"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 font-mono outline-none transition-all"
                  style={{
                    background:'rgba(255,255,255,0.06)',
                    border:`1px solid ${customRoom && !isValidRoomName(sanitizeCustomRoom(customRoom)) ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}`,
                    letterSpacing:'0.1em',
                    textTransform:'uppercase',
                  }}
                  onFocus={e => e.target.style.borderColor='rgba(239,68,68,0.5)'}
                  onBlur={e  => e.target.style.borderColor = customRoom && !isValidRoomName(sanitizeCustomRoom(customRoom)) ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}
                  maxLength={32}
                />
                {/* Aide + compteur */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:5}}>
                  <p style={{color:'rgba(255,255,255,0.3)',fontSize:10,margin:0}}>
                    {customRoom && !isValidRoomName(sanitizeCustomRoom(customRoom))
                      ? <span style={{color:'#f87171'}}>Min 3 caractères, lettres et chiffres</span>
                      : 'Lettres, chiffres, tirets · ex : RTN ou DEBAT-2025'
                    }
                  </p>
                  <span style={{color:'rgba(255,255,255,0.25)',fontSize:10}}>
                    {sanitizeCustomRoom(customRoom).length}/32
                  </span>
                </div>
              </div>
            )}

            {/* Aperçu du code final */}
            <div style={{
              marginTop:10, padding:'8px 12px', borderRadius:10,
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
              display:'flex', alignItems:'center', gap:8,
            }}>
              <span style={{color:'rgba(255,255,255,0.3)',fontSize:10}}>Code final :</span>
              <span style={{
                fontFamily:'monospace', fontSize:12, fontWeight:700,
                color: codeMode==='custom' && !isValidRoomName(sanitizeCustomRoom(customRoom)) && customRoom
                  ? '#f87171' : '#4ade80',
                letterSpacing:'0.08em',
              }}>
                {codePreview}
              </span>
            </div>
          </div>
        )}

        {/* ── Onglet VIEWER : champ code ── */}
        {tab === 'viewer' && (
          <div className="mb-4">
            <label className="block text-white/50 text-xs font-semibold mb-1.5 uppercase tracking-wide">
              Code du live
            </label>
            <input
              value={room}
              onChange={e => setRoom(e.target.value.toUpperCase())}
              placeholder="Ex : ABCD-EFGH ou RTN"
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 font-mono outline-none transition-all"
              style={{
                background:'rgba(255,255,255,0.06)',
                border:'1px solid rgba(255,255,255,0.12)',
                letterSpacing:'0.1em',
              }}
              onFocus={e => e.target.style.borderColor='rgba(37,99,235,0.5)'}
              onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.12)'}
            />
            <p style={{color:'rgba(255,255,255,0.25)',fontSize:10,marginTop:5}}>
              Le code peut être auto-généré (XXXX-XXXX) ou personnalisé (ex : RTN)
            </p>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <p className="text-red-400 text-xs mb-4 px-1 animate-fade-in">{error}</p>
        )}

        {/* Bouton action principal */}
        <button
          onClick={tab === 'host' ? handleHost : handleJoin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all active:scale-95"
          style={{
            background: tab === 'host'
              ? loading ? '#9b1c1c' : '#ef4444'
              : loading ? '#1e40af' : '#2563eb',
            boxShadow: tab === 'host'
              ? '0 4px 20px rgba(239,68,68,0.3)'
              : '0 4px 20px rgba(37,99,235,0.3)',
          }}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Connexion…</>
            : tab === 'host'
              ? <><Radio className="w-4 h-4" /> Démarrer le live <ArrowRight className="w-4 h-4 ml-1" /></>
              : <><Users className="w-4 h-4" /> Rejoindre le live <ArrowRight className="w-4 h-4 ml-1" /></>
          }
        </button>

        {/* Info bas de card */}
        <p className="text-center text-white/25 text-xs mt-4">
          {tab === 'host'
            ? codeMode === 'custom'
              ? 'Partage ce nom avec tes spectateurs pour qu\'ils te rejoignent'
              : 'Ce code sera partagé avec tes spectateurs pour rejoindre le live'
            : 'Demande le code au streamer pour rejoindre'}
        </p>
      </div>

      <p className="mt-6 text-white/20 text-xs">
        Propulsé par · WebRTC CDN
      </p>

      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}