// src/routes/Join.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Page de jonction directe — accessible via /join/:room ou /stream/:room?join=1
//
// FLUX :
//   1. L'hôte partage le lien : https://…/join/RTN  (ou /join/XXXX-XXXX)
//   2. Le visiteur arrive ici, voit le code du live pré-rempli et verrouillé
//   3. Il entre uniquement son nom (comme Google Meet)
//   4. Clic "Rejoindre" → joinStream() → redirige vers /stream/:room
//
// QR CODE :
//   Le lien partagé pointe vers cette page, donc le QR code amène aussi ici.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tv2, Users, ArrowRight, Loader2 } from 'lucide-react';
import { joinStream } from '../api/stream.js';

export default function Join() {
  const { room }   = useParams();               // code depuis /join/:room
  const navigate   = useNavigate();
  const roomCode   = room?.toUpperCase() || '';

  const [name,    setName]    = useState(() => sessionStorage.getItem('stream_last_name') || '');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const nameRef = useRef(null);

  // Focus automatique sur le champ nom
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleJoin = async (e) => {
    e?.preventDefault();
    if (!name.trim()) return setError('Entre ton nom pour rejoindre');
    if (!roomCode)    return setError('Code de live invalide');
    setError(''); setLoading(true);
    try {
      const data = await joinStream(name.trim(), roomCode);
      sessionStorage.setItem('stream_last_name', name.trim());
      sessionStorage.setItem(`stream_${roomCode}`, JSON.stringify({
        token: data.token, role: 'viewer', displayName: name.trim(), wsUrl: data.wsUrl,
      }));
      navigate(`/stream/${roomCode}`);
    } catch (e) {
      setError(e.message || 'Impossible de rejoindre ce live');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #060d1f 0%, #0a1628 50%, #060d1f 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <img
            src="/senegal.jpg"
            alt="Logo"
            style={{ width: '50px', height: '50px', borderRadius: '10px', objectFit: 'contain', background: '#fff', flexShrink: 0 }}
          />
          <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 26, margin: 0, letterSpacing: '-0.5px' }}>
            Di<span style={{ color: '#ef4444' }}>soo</span>
          </h1>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 }}>
          Tu es invité à rejoindre un live
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24, padding: '32px 28px',
        maxWidth: 420, width: '100%',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
      }}>

        {/* Titre + code live */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
          }}>
            <Users style={{ width: 22, height: 22, color: '#60a5fa' }}/>
          </div>
          <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 20, margin: '0 0 8px' }}>
            Rejoindre le live
          </h2>
          {/* Code verrouillé — affiché mais non modifiable */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 99,
            background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa' }}/>
            <span style={{
              fontFamily: 'monospace', fontSize: 15, fontWeight: 800,
              color: '#60a5fa', letterSpacing: '0.15em',
            }}>
              {roomCode}
            </span>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Champ nom */}
          <div>
            <label style={{
              display: 'block', color: 'rgba(255,255,255,0.5)',
              fontSize: 11, fontWeight: 700, marginBottom: 6,
              textTransform: 'uppercase', letterSpacing: '0.6px',
            }}>
              Ton nom d'affichage
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }}
              placeholder="Ex : Mamadou Diallo"
              autoComplete="name"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '13px 16px', borderRadius: 13,
                background: 'rgba(255,255,255,0.07)',
                border: '1.5px solid rgba(255,255,255,0.12)',
                color: '#fff', fontSize: 14,
                outline: 'none', transition: 'border-color 0.15s',
              }}
              onFocus={e  => e.target.style.borderColor = 'rgba(37,99,235,0.6)'}
              onBlur={e   => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
            />
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: '5px 0 0', paddingLeft: 2 }}>
              Ce nom sera visible par tous les participants
            </p>
          </div>

          {/* Erreur */}
          {error && (
            <div style={{
              padding: '10px 13px', borderRadius: 10,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#f87171', fontSize: 12, lineHeight: 1.4,
            }}>
              {error}
            </div>
          )}

          {/* Bouton rejoindre */}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            style={{
              width: '100%', padding: '14px',
              borderRadius: 14, border: 'none',
              background: loading || !name.trim() ? '#1e40af' : '#2563eb',
              color: '#fff', fontWeight: 700, fontSize: 14,
              cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
              opacity: !name.trim() && !loading ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s',
              boxShadow: !name.trim() ? 'none' : '0 4px 20px rgba(37,99,235,0.4)',
            }}
            onMouseEnter={e => { if (!loading && name.trim()) e.currentTarget.style.background = '#1d4ed8'; }}
            onMouseLeave={e => { e.currentTarget.style.background = loading || !name.trim() ? '#1e40af' : '#2563eb'; }}
          >
            {loading
              ? <><Loader2 style={{ width: 16, height: 16, animation: 'joinSpin 0.8s linear infinite' }}/> Connexion…</>
              : <><Users style={{ width: 16, height: 16 }}/> Rejoindre le live <ArrowRight style={{ width: 16, height: 16 }}/></>
            }
          </button>

        </form>
      </div>

      {/* Lien retour */}
      <button
        onClick={() => navigate('/')}
        style={{
          marginTop: 20, background: 'none', border: 'none',
          color: 'rgba(255,255,255,0.3)', fontSize: 12,
          cursor: 'pointer', textDecoration: 'underline',
        }}
      >
        Retour à l'accueil
      </button>

      <style>{`
        @keyframes joinSpin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.25) !important; }
      `}</style>
    </div>
  );
}