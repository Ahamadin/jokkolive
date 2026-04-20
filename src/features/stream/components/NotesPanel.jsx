// src/features/stream/components/NotesPanel.jsx
// Notes partagées en temps réel + téléchargement .txt/.md + upload/partage fichiers
import { useState, useEffect, useRef, useCallback } from 'react';
import { useStream } from '../context/StreamContext.jsx';
import { FileText, X, Download, Upload, Trash2, File, Image, FileArchive } from 'lucide-react';

function FileIcon({ type }) {
  if (type?.startsWith('image/'))               return <Image size={14} color="#60a5fa" />;
  if (type?.includes('zip')||type?.includes('rar')) return <FileArchive size={14} color="#f59e0b" />;
  return <File size={14} color="rgba(255,255,255,0.5)" />;
}
function fmtSize(b) {
  if (b<1024) return `${b} o`;
  if (b<1048576) return `${(b/1024).toFixed(1)} Ko`;
  return `${(b/1048576).toFixed(1)} Mo`;
}

export default function NotesPanel() {
  const { notes, updateNotes, setActivePanel, publish, displayName } = useStream();
  const [local,     setLocal]     = useState(notes);
  const [tab,       setTab]       = useState('notes');
  const [files,     setFiles]     = useState([]);
  const [dragOver,  setDragOver]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const saveTimer                 = useRef(null);
  const fileInputRef              = useRef(null);

  useEffect(() => { setLocal(notes); }, [notes]);

  // Recevoir fichiers des autres participants
  useEffect(() => {
    const handler = (e) => {
      setFiles(prev => prev.find(f=>f.id===e.detail.id) ? prev : [...prev, e.detail]);
    };
    window.addEventListener('stream:file_received', handler);
    return () => window.removeEventListener('stream:file_received', handler);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setLocal(val);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => updateNotes(val), 600);
  };

  const downloadNotes = (fmt) => {
    if (!local.trim()) return;
    const ext  = fmt==='md'?'md':'txt';
    const mime = fmt==='md'?'text/markdown':'text/plain';
    const a    = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([local],{type:mime})), download:`notes-live.${ext}` });
    a.click(); URL.revokeObjectURL(a.href);
  };

  const processFiles = useCallback(async (rawFiles) => {
    setUploading(true);
    try {
      for (const file of Array.from(rawFiles)) {
        if (file.size > 10*1024*1024) { alert(`"${file.name}" dépasse 10 Mo`); continue; }
        const dataUrl = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=e=>res(e.target.result); r.onerror=rej; r.readAsDataURL(file); });
        const meta = { id: Date.now()+Math.random(), name:file.name, type:file.type, size:file.size, data:dataUrl, from:displayName||'Moi', ts:Date.now() };
        setFiles(prev=>[...prev, meta]);
        await publish({ type:'file_shared', file:meta });
      }
    } catch(e){ console.error(e); }
    finally { setUploading(false); }
  }, [publish, displayName]);

  const downloadFile = (file) => {
    const a = Object.assign(document.createElement('a'),{href:file.data, download:file.name});
    a.click();
  };

  const S = {
    btn: (bg='rgba(255,255,255,0.08)', col='rgba(255,255,255,0.7)') => ({
      display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8,
      border:'none', cursor:'pointer', background:bg, color:col, fontSize:11, fontWeight:600,
    }),
    iconBtn: (bg) => ({
      width:30, height:30, borderRadius:8, border:'none', cursor:'pointer',
      background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
    }),
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#0c1632' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <FileText size={15} color="rgba(255,255,255,0.5)" />
          <span style={{ color:'#fff', fontWeight:700, fontSize:13 }}>Notes & Fichiers</span>
        </div>
        <button onClick={()=>setActivePanel('notes')} style={{ width:28,height:28,borderRadius:8,border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,0.4)' }}>
          <X size={15} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', flexShrink:0, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
        {[{k:'notes',l:'📝 Notes'},{k:'files',l:`📎 Fichiers${files.length?` (${files.length})`:''}`}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{ flex:1,padding:'9px 0',border:'none',cursor:'pointer',fontSize:12,fontWeight:700,background:'transparent',color:tab===t.k?'#fff':'rgba(255,255,255,0.35)',borderBottom:tab===t.k?'2px solid #2563eb':'2px solid transparent',transition:'all 0.15s' }}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── TAB NOTES ── */}
      {tab==='notes' && <>
        <div style={{ padding:'8px 16px 2px', flexShrink:0 }}>
          <p style={{ color:'rgba(255,255,255,0.28)', fontSize:11, margin:0 }}>Partagées avec tous les participants en temps réel</p>
        </div>
        <div style={{ flex:1, padding:'6px 12px', minHeight:0 }}>
          <textarea value={local} onChange={handleChange}
            placeholder={'Écrivez vos notes ici…\n\nTout le monde peut les voir et modifier en temps réel.'}
            style={{ width:'100%', height:'100%', resize:'none', boxSizing:'border-box', borderRadius:12, padding:'12px', fontSize:13, color:'#e2e8f0', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', outline:'none', lineHeight:1.6, fontFamily:'inherit', transition:'border-color 0.15s' }}
            onFocus={e=>e.target.style.borderColor='rgba(37,99,235,0.45)'}
            onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'}
          />
        </div>
        {/* Téléchargements */}
        <div style={{ padding:'10px 12px 14px', flexShrink:0, display:'flex', gap:6, alignItems:'center' }}>
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.25)', flex:1 }}>
            {local.trim() ? `${local.trim().split(/\s+/).filter(Boolean).length} mots` : 'Vide'}
          </span>
          <button onClick={()=>downloadNotes('txt')} style={S.btn()} disabled={!local.trim()}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.15)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'}>
            <Download size={13} /> .txt
          </button>
          <button onClick={()=>downloadNotes('md')} style={S.btn('rgba(37,99,235,0.2)','#60a5fa')} disabled={!local.trim()}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(37,99,235,0.35)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(37,99,235,0.2)'}>
            <Download size={13} /> .md
          </button>
        </div>
      </>}

      {/* ── TAB FICHIERS ── */}
      {tab==='files' && <>
        {/* Zone drop */}
        <div
          onDragOver={e=>{e.preventDefault();setDragOver(true);}}
          onDragLeave={()=>setDragOver(false)}
          onDrop={e=>{e.preventDefault();setDragOver(false);e.dataTransfer.files?.length&&processFiles(e.dataTransfer.files);}}
          onClick={()=>fileInputRef.current?.click()}
          style={{ margin:'12px', borderRadius:12, cursor:'pointer', border:`2px dashed ${dragOver?'#2563eb':'rgba(255,255,255,0.12)'}`, background:dragOver?'rgba(37,99,235,0.08)':'rgba(255,255,255,0.03)', padding:'20px 16px', textAlign:'center', flexShrink:0, transition:'all 0.15s' }}>
          <input ref={fileInputRef} type="file" multiple style={{ display:'none' }} onChange={e=>e.target.files?.length&&processFiles(e.target.files)} />
          {uploading
            ? <><div style={{ width:20,height:20,border:'2px solid #2563eb',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 8px' }}/><span style={{ color:'rgba(255,255,255,0.4)',fontSize:12 }}>Envoi en cours…</span></>
            : <><Upload size={22} color={dragOver?'#60a5fa':'rgba(255,255,255,0.25)'} style={{ marginBottom:8 }} /><p style={{ color:dragOver?'#60a5fa':'rgba(255,255,255,0.4)',fontSize:12,margin:0,fontWeight:600 }}>{dragOver?'Déposer ici':'Cliquer ou glisser un fichier'}</p><p style={{ color:'rgba(255,255,255,0.2)',fontSize:10,margin:'4px 0 0' }}>Max 10 Mo — partagé avec tous</p></>
          }
        </div>

        {/* Liste */}
        <div style={{ flex:1,overflowY:'auto',padding:'0 12px 12px',minHeight:0 }}>
          {files.length===0 && (
            <p style={{ color:'rgba(255,255,255,0.2)',fontSize:12,textAlign:'center',padding:'24px 0' }}>Aucun fichier partagé</p>
          )}
          {files.map(file=>(
            <div key={file.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:12,marginBottom:6,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.07)' }}>
              <FileIcon type={file.type} />
              <div style={{ flex:1,minWidth:0 }}>
                <p style={{ margin:0,fontSize:12,fontWeight:600,color:'#e2e8f0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{file.name}</p>
                <p style={{ margin:0,fontSize:10,color:'rgba(255,255,255,0.3)' }}>{fmtSize(file.size)} · {file.from}</p>
              </div>
              {file.type?.startsWith('image/') && (
                <img src={file.data} alt="" style={{ width:36,height:36,objectFit:'cover',borderRadius:6,flexShrink:0 }} />
              )}
              <button onClick={()=>downloadFile(file)} style={S.iconBtn('rgba(37,99,235,0.2)')} title="Télécharger"
                onMouseEnter={e=>e.currentTarget.style.background='rgba(37,99,235,0.4)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(37,99,235,0.2)'}>
                <Download size={13} color="#60a5fa" />
              </button>
              <button onClick={()=>setFiles(p=>p.filter(f=>f.id!==file.id))} style={S.iconBtn('rgba(239,68,68,0.1)')} title="Retirer"
                onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.25)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(239,68,68,0.1)'}>
                <Trash2 size={13} color="#f87171" />
              </button>
            </div>
          ))}
        </div>
      </>}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}