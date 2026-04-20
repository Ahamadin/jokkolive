// src/features/stream/components/FileViewerPanel.jsx
// Panneau dédié aux fichiers partagés en live
// Tous les fichiers envoyés par n'importe quel participant apparaissent ici
// en temps réel via window event 'stream:file_received'
import { useState, useEffect, useRef, useCallback } from 'react';
import { useStream } from '../context/StreamContext.jsx';
import {
  Paperclip, X, Download, Trash2,
  File, Image as ImageIcon, FileArchive, FileText as FileTextIcon,
  Film, Music, Upload,
} from 'lucide-react';

// ── Icône selon type MIME ────────────────────────────────────
function FileIcon({ type, size = 16 }) {
  if (!type) return <File size={size} color="rgba(255,255,255,0.45)"/>;
  if (type.startsWith('image/'))              return <ImageIcon  size={size} color="#60a5fa"/>;
  if (type.startsWith('video/'))              return <Film       size={size} color="#a78bfa"/>;
  if (type.startsWith('audio/'))              return <Music      size={size} color="#34d399"/>;
  if (type.includes('pdf'))                   return <FileTextIcon size={size} color="#f87171"/>;
  if (type.includes('zip') || type.includes('rar') || type.includes('7z'))
    return <FileArchive size={size} color="#f59e0b"/>;
  return <File size={size} color="rgba(255,255,255,0.45)"/>;
}

// ── Formatage taille ─────────────────────────────────────────
function fmtSize(b) {
  if (b < 1024)     return `${b} o`;
  if (b < 1048576)  return `${(b / 1024).toFixed(1)} Ko`;
  return `${(b / 1048576).toFixed(1)} Mo`;
}

// ── Formatage heure ──────────────────────────────────────────
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ── Preview image dans un overlay ───────────────────────────
function ImagePreview({ file, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ position:'fixed', inset:0, zIndex:20000, background:'rgba(0,0,0,0.88)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
    >
      <div style={{ position:'relative', maxWidth:'90vw', maxHeight:'85vh' }} onClick={e => e.stopPropagation()}>
        <img
          src={file.data} alt={file.name}
          style={{ maxWidth:'100%', maxHeight:'82vh', borderRadius:12, boxShadow:'0 24px 64px rgba(0,0,0,0.7)', display:'block' }}
        />
        <button
          onClick={onClose}
          style={{ position:'absolute', top:-12, right:-12, width:32, height:32, borderRadius:'50%', border:'none', background:'rgba(255,255,255,0.12)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}
        >
          <X size={14} color="#fff"/>
        </button>
        <div style={{ position:'absolute', bottom:-32, left:0, right:0, textAlign:'center' }}>
          <span style={{ color:'rgba(255,255,255,0.5)', fontSize:11 }}>{file.name}</span>
        </div>
      </div>
    </div>
  );
}

// ── Carte fichier ────────────────────────────────────────────
function FileCard({ file, onDelete, isNew }) {
  const [hovered,   setHovered]   = useState(false);
  const [imgPreview, setImgPreview] = useState(false);
  const isImage = file.type?.startsWith('image/');

  const download = () => {
    const a = Object.assign(document.createElement('a'), { href: file.data, download: file.name });
    a.click();
  };

  return (
    <>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display:'flex', alignItems:'center', gap:10,
          padding:'10px 12px', borderRadius:12, marginBottom:6,
          background: isNew ? 'rgba(37,99,235,0.12)' : (hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)'),
          border: isNew ? '1px solid rgba(37,99,235,0.3)' : '1px solid rgba(255,255,255,0.07)',
          transition:'all 0.15s', cursor: isImage ? 'pointer' : 'default',
        }}
        onClick={isImage ? () => setImgPreview(true) : undefined}
      >
        {/* Miniature image ou icône */}
        <div style={{ width:38, height:38, borderRadius:8, overflow:'hidden', flexShrink:0, background:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {isImage
            ? <img src={file.data} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            : <FileIcon type={file.type} size={18}/>
          }
        </div>

        {/* Infos */}
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:'0 0 2px', fontSize:12, fontWeight:600, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{file.name}</p>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>{fmtSize(file.size)}</span>
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.15)' }}>·</span>
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>{file.from}</span>
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.15)' }}>·</span>
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)' }}>{fmtTime(file.ts)}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:4, flexShrink:0 }}>
          <button
            onClick={e => { e.stopPropagation(); download(); }}
            title="Télécharger"
            style={{ width:30, height:30, borderRadius:8, border:'none', cursor:'pointer', background:'rgba(37,99,235,0.18)', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s' }}
            onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.background='rgba(37,99,235,0.38)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(37,99,235,0.18)'; }}
          >
            <Download size={13} color="#60a5fa"/>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(file.id); }}
            title="Retirer de la liste"
            style={{ width:30, height:30, borderRadius:8, border:'none', cursor:'pointer', background:'rgba(239,68,68,0.1)', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s' }}
            onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.background='rgba(239,68,68,0.28)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(239,68,68,0.1)'; }}
          >
            <Trash2 size={13} color="#f87171"/>
          </button>
        </div>
      </div>

      {imgPreview && <ImagePreview file={file} onClose={() => setImgPreview(false)}/>}
    </>
  );
}

// ── Composant principal ──────────────────────────────────────
export default function FileViewerPanel() {
  const { publish, displayName, setActivePanel } = useStream();
  const [files,    setFiles]    = useState([]);
  const [newIds,   setNewIds]   = useState(new Set()); // IDs récemment reçus → highlight
  const [dragOver, setDragOver] = useState(false);
  const [sending,  setSending]  = useState(false);
  const fileInputRef            = useRef(null);
  const MAX_SIZE = 10 * 1024 * 1024;

  // ── Recevoir fichiers des autres (et de soi-même via FileBtn) ──
  useEffect(() => {
    const handler = (e) => {
      const f = e.detail;
      setFiles(prev => prev.find(x => x.id === f.id) ? prev : [...prev, f]);
      // Badge "nouveau" pendant 4 secondes
      setNewIds(prev => new Set([...prev, f.id]));
      setTimeout(() => setNewIds(prev => { const n = new Set(prev); n.delete(f.id); return n; }), 4000);
    };
    window.addEventListener('stream:file_received', handler);
    return () => window.removeEventListener('stream:file_received', handler);
  }, []);

  // ── Envoyer un fichier ──────────────────────────────────────
  const processFiles = useCallback(async (rawFiles) => {
    setSending(true);
    try {
      for (const file of Array.from(rawFiles)) {
        if (file.size > MAX_SIZE) { alert(`"${file.name}" dépasse 10 Mo.`); continue; }
        const dataUrl = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload  = ev => res(ev.target.result);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        const payload = {
          id:   `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name, type: file.type || 'application/octet-stream',
          size: file.size, data: dataUrl,
          from: displayName || 'Moi', ts: Date.now(),
        };
        await publish({ type: 'file_shared', file: payload });
        // Déclencher localement pour que l'envoyeur voit aussi son fichier
        window.dispatchEvent(new CustomEvent('stream:file_received', { detail: payload }));
      }
    } catch (e) { console.error('[FileViewerPanel] send error:', e); }
    finally { setSending(false); }
  }, [publish, displayName]);

  const handleInputChange = (e) => {
    if (e.target.files?.length) { processFiles(e.target.files); e.target.value = ''; }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
  };

  const handleDelete = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#0c1632' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Paperclip size={15} color="rgba(255,255,255,0.5)"/>
          <span style={{ color:'#fff', fontWeight:700, fontSize:13 }}>
            Fichiers partagés
            {files.length > 0 && (
              <span style={{ marginLeft:8, padding:'1px 7px', borderRadius:99, background:'rgba(37,99,235,0.3)', color:'#60a5fa', fontSize:10, fontWeight:800 }}>
                {files.length}
              </span>
            )}
          </span>
        </div>
        <button
          onClick={() => setActivePanel('files')}
          style={{ width:28, height:28, borderRadius:8, border:'none', background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.4)' }}
        >
          <X size={15}/>
        </button>
      </div>

      {/* ── Zone drop / upload ── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          margin:'10px 12px 6px', borderRadius:12, cursor:'pointer', flexShrink:0,
          border: `2px dashed ${dragOver ? '#2563eb' : 'rgba(255,255,255,0.1)'}`,
          background: dragOver ? 'rgba(37,99,235,0.08)' : 'rgba(255,255,255,0.02)',
          padding:'14px 16px', textAlign:'center', transition:'all 0.15s',
        }}
      >
        <input ref={fileInputRef} type="file" multiple style={{ display:'none' }} onChange={handleInputChange}/>
        {sending ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            <div style={{ width:16, height:16, border:'2px solid rgba(37,99,235,0.3)', borderTopColor:'#2563eb', borderRadius:'50%', animation:'fvpSpin 0.8s linear infinite' }}/>
            <span style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>Envoi en cours…</span>
          </div>
        ) : (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            <Upload size={15} color={dragOver ? '#60a5fa' : 'rgba(255,255,255,0.3)'}/>
            <span style={{ color: dragOver ? '#60a5fa' : 'rgba(255,255,255,0.4)', fontSize:12, fontWeight:600 }}>
              {dragOver ? 'Déposer ici' : 'Cliquer ou glisser pour partager'}
            </span>
            <span style={{ color:'rgba(255,255,255,0.2)', fontSize:11 }}>· Max 10 Mo</span>
          </div>
        )}
      </div>

      {/* ── Liste des fichiers ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'4px 12px 14px', minHeight:0 }}>
        {files.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:10, paddingBottom:24 }}>
            <div style={{ width:52, height:52, borderRadius:16, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Paperclip size={22} color="rgba(255,255,255,0.2)"/>
            </div>
            <div style={{ textAlign:'center' }}>
              <p style={{ color:'rgba(255,255,255,0.35)', fontSize:12, fontWeight:600, margin:'0 0 4px' }}>Aucun fichier partagé</p>
              <p style={{ color:'rgba(255,255,255,0.2)', fontSize:11, margin:0 }}>Les fichiers envoyés par les participants apparaissent ici</p>
            </div>
          </div>
        ) : (
          files.map(file => (
            <FileCard
              key={file.id}
              file={file}
              onDelete={handleDelete}
              isNew={newIds.has(file.id)}
            />
          ))
        )}
      </div>

      <style>{`@keyframes fvpSpin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}