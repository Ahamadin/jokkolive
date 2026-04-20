// src/features/stream/components/FileShareButton.jsx
// ─────────────────────────────────────────────────────────────
// Bouton upload fichier autonome (utilisable hors de StreamControls)
// → même logique que FileBtn dans StreamControls.jsx
// → à utiliser si tu veux placer le bouton ailleurs dans l'UI
// ─────────────────────────────────────────────────────────────
import { useState, useRef, useCallback } from 'react';
import { Paperclip } from 'lucide-react';
import { useStream } from '../context/StreamContext.jsx';

const MAX_MB   = 10;
const MAX_SIZE = MAX_MB * 1024 * 1024;

export default function FileShareButton({ onUploaded }) {
  const { publish, displayName } = useStream();
  const inputRef  = useRef(null);
  const [hover,   setHover]   = useState(false);
  const [sending, setSending] = useState(false);

  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE) {
      alert(`Fichier trop grand. Maximum ${MAX_MB} Mo.`);
      e.target.value = '';
      return;
    }
    setSending(true);
    try {
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload  = ev => res(ev.target.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const payload = {
        id:   `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        data: dataUrl,
        from: displayName || 'Vous',
        ts:   Date.now(),
      };
      await publish({ type: 'file_shared', file: payload });
      // Déclencher localement (pour que l'envoyeur voit son propre fichier dans le NotesPanel)
      window.dispatchEvent(new CustomEvent('stream:file_received', { detail: payload }));
      onUploaded?.();
    } catch (err) {
      console.error('[FileShareButton] error:', err);
      alert('Erreur lors du partage du fichier.');
    } finally {
      setSending(false);
      e.target.value = '';
    }
  }, [publish, displayName, onUploaded]);

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, flexShrink:0 }}>
      <input ref={inputRef} type="file" onChange={handleFile} style={{ display:'none' }}/>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={sending}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title={`Partager un fichier (max ${MAX_MB} Mo) — visible dans l'onglet Fichiers`}
        style={{
          width:44, height:44, borderRadius:12, border:'none',
          cursor: sending ? 'not-allowed' : 'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          background: sending
            ? 'rgba(37,99,235,0.3)'
            : hover ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)',
          color: sending ? '#60a5fa' : hover ? '#fff' : 'rgba(255,255,255,0.65)',
          transition:'all 0.15s',
        }}
      >
        {sending
          ? <div style={{ width:17, height:17, border:'2px solid rgba(255,255,255,0.2)', borderTopColor:'#60a5fa', borderRadius:'50%', animation:'fbSpin 0.8s linear infinite' }}/>
          : <Paperclip size={17}/>
        }
      </button>
      <span style={{ fontSize:10, color:sending?'#60a5fa':'rgba(255,255,255,0.38)', fontWeight:500, whiteSpace:'nowrap' }}>
        {sending ? 'Envoi…' : 'Fichier'}
      </span>
      <style>{`@keyframes fbSpin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}