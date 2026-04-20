// src/features/stream/components/StreamStatsPanel.jsx
import { useState, useEffect, useRef } from 'react';
import { useStream }      from '../context/StreamContext.jsx';
import { useStreamTimer } from '../hooks/useStreamTimer.js';

const PALETTE = ['#2563eb','#0891b2','#059669','#7c3aed','#be185d','#b45309','#dc2626','#0284c7','#4f46e5','#0f766e'];
function colorFor(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (str.charCodeAt(i) + ((h << 5) - h));
  return PALETTE[Math.abs(h) % PALETTE.length];
}
function fmt(ms) {
  if (!ms || ms <= 0) return '0s';
  const s = Math.floor(ms/1000), m = Math.floor(s/60), h = Math.floor(m/60);
  if (h > 0) return `${h}h ${m%60}m`; if (m > 0) return `${m}m ${s%60}s`; return `${s}s`;
}
function fmtClock(ts)    { if (!ts) return '--:--'; return new Date(ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}); }
function fmtClockSec(ts) { if (!ts) return '--:--'; return new Date(ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}); }
function totalSessionMs(sessions=[], nowMs=Date.now()) {
  return sessions.reduce((acc,s) => acc + Math.max(0,(s.leaveTime||nowMs)-s.joinTime), 0);
}

// ── Icônes — color + size en props, JAMAIS currentColor ──────
const Svg = ({ children, color, size=13 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" style={{width:size,height:size,flexShrink:0}}>
    {children}
  </svg>
);
const IcoX        = () => <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoClock    = ({color='rgba(255,255,255,0.6)',size=13}) => <Svg color={color} size={size}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Svg>;
const IcoUsers    = ({color='rgba(255,255,255,0.6)',size=13}) => <Svg color={color} size={size}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Svg>;
const IcoMsg      = ({color='rgba(255,255,255,0.6)',size=13}) => <Svg color={color} size={size}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Svg>;
const IcoHand     = ({color='rgba(255,255,255,0.6)',size=13}) => <Svg color={color} size={size}><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></Svg>;
const IcoActivity = ({color='rgba(255,255,255,0.6)',size=13}) => <Svg color={color} size={size}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></Svg>;
const IcoDownload = ({color='rgba(255,255,255,0.6)',size=13}) => <Svg color={color} size={size}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Svg>;
const IcoTrend    = ({color='rgba(255,255,255,0.6)',size=13}) => <Svg color={color} size={size}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></Svg>;
const IcoMic      = ({color='rgba(255,255,255,0.6)',size=13}) => <Svg color={color} size={size}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></Svg>;
const IcoPercent  = ({color='rgba(255,255,255,0.6)',size=13}) => <Svg color={color} size={size}><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></Svg>;
const IcoAward    = ({color='#f59e0b',size=18}) => <Svg color={color} size={size}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></Svg>;
const IcoLogIn    = ({color='#4ade80'}) => <Svg color={color} size={10}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></Svg>;
const IcoLogOut   = ({color='#f87171'}) => <Svg color={color} size={10}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Svg>;

function Bar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value/max)*100)) : 0;
  return (
    <div style={{flex:1,height:6,borderRadius:9999,background:'rgba(255,255,255,0.08)',overflow:'hidden'}}>
      <div style={{width:`${pct}%`,height:'100%',background:color,borderRadius:9999,transition:'width 0.5s'}}/>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:12,padding:'12px',display:'flex',flexDirection:'column',gap:6}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:28,height:28,borderRadius:8,background:color+'1a',border:`1px solid ${color}33`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <Icon color={color} size={14}/>
        </div>
        <span style={{color:'rgba(255,255,255,0.4)',fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px'}}>{label}</span>
      </div>
      <div style={{color:'#fff',fontSize:20,fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{value}</div>
      {sub && <div style={{color:'rgba(255,255,255,0.3)',fontSize:10}}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ icon: Icon, label, color }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
      <Icon color={color} size={13}/>
      <span style={{color,fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px'}}>{label}</span>
    </div>
  );
}

// ── Export PDF ────────────────────────────────────────────────
function doExportPDF({ partList, chatMessages, msgCounts, speakTime, handRaisedIds,
                       viewerCount, peakViewers, reactions, streamStartTime, roomName,
                       timer, participantSessions, nowMs }) {
  const now = new Date();
  const elapsed = streamStartTime ? now - new Date(streamStartTime) : 0;
  const totalSpk = Object.values(speakTime).reduce((s,v) => s+v, 0);

  const rows = partList.map((p,i) => {
    const name=p.name||p.identity||'?', spk=speakTime[p.identity]||0;
    const pct=totalSpk>0?Math.round((spk/totalSpk)*100):0;
    const msgs=msgCounts[p.name||p.identity]||0;
    const isOnStage=p.permissions?.canPublish||p.permissions?.roomAdmin;
    const sessions=participantSessions?.[p.identity]||[];
    const totalMs=totalSessionMs(sessions,nowMs);
    const bg=i%2===0?'#f8faff':'#fff';
    return `<tr style="background:${bg}">
      <td style="padding:8px 10px;border-bottom:1px solid #e5eaf5;color:#64748b">${i+1}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5eaf5;color:#1a2b5c;font-weight:700">${name}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5eaf5">
        <span style="background:${isOnStage?'#dbeafe':'#f1f5f9'};color:${isOnStage?'#1d4ed8':'#64748b'};padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700">${isOnStage?'Scène':'Spectateur'}</span>
      </td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5eaf5;color:#2563eb;font-weight:600">${fmt(spk)} (${pct}%)</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5eaf5;color:#0891b2;font-weight:600">${msgs}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5eaf5;color:#7c3aed;font-weight:600">${fmt(totalMs)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e5eaf5;color:#94a3b8">${sessions.length}</td>
    </tr>`;
  }).join('');

  const sessionRows = partList.map(p => {
    const name=p.name||p.identity||'?';
    const sessions=participantSessions?.[p.identity]||[];
    if (!sessions.length) return '';
    const lines=sessions.map((s,idx)=>`
      <tr>
        <td style="padding:4px 10px;color:#64748b">#${idx+1}</td>
        <td style="padding:4px 10px;color:#16a34a;font-weight:600">${fmtClockSec(s.joinTime)}</td>
        <td style="padding:4px 10px;color:${s.leaveTime?'#dc2626':'#16a34a'};font-weight:600">${s.leaveTime?fmtClockSec(s.leaveTime):'⬤ En cours'}</td>
        <td style="padding:4px 10px;color:#1a2b5c;font-weight:600">${fmt((s.leaveTime||nowMs)-s.joinTime)}</td>
      </tr>`).join('');
    return `<tr><td colspan="4" style="padding:8px 10px 4px;font-weight:700;color:#1a2b5c;background:#f8faff;border-top:2px solid #e5eaf5">${name}</td></tr>${lines}`;
  }).filter(Boolean).join('');

  const html=`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Rapport Live — ${roomName}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1e293b}
.page{max-width:960px;margin:0 auto;padding:36px}
.header{text-align:center;margin-bottom:28px;padding-bottom:18px;border-bottom:3px solid #1a2b5c}
.brand{font-size:22px;font-weight:800;color:#1a2b5c}.sub{font-size:11px;color:#2563eb;font-weight:700;margin-top:5px;text-transform:uppercase;letter-spacing:1px}
.badge{display:inline-flex;align-items:center;gap:5px;background:#1a2b5c;color:#fff;font-size:10px;font-weight:800;padding:3px 12px;border-radius:99px;margin-top:8px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:24px}
.card{background:#f0f4ff;border:1px solid #d1dbff;border-radius:10px;padding:13px}
.cl{font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}.cv{font-size:15px;font-weight:700;color:#1a2b5c}
.stitle{font-size:10px;font-weight:800;color:#1a2b5c;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:10px;padding-bottom:5px;border-bottom:2px solid #e5eaf5}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
thead{background:#1a2b5c}thead th{padding:9px 10px;color:#fff;font-size:9px;text-align:left;font-weight:700;text-transform:uppercase}
.footer{margin-top:24px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:12px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head>
<body><div class="page">
<div class="header"><div class="brand">🎙️ JokkoLive</div><div class="sub">Rapport analytique du live</div>
<div class="badge"><span style="width:7px;height:7px;border-radius:50%;background:#ef4444;display:inline-block"></span> CODE : ${roomName}</div></div>
<div class="grid">
  <div class="card"><div class="cl">Date</div><div class="cv" style="font-size:11px">${now.toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div></div>
  <div class="card"><div class="cl">Durée</div><div class="cv">${timer||fmt(elapsed)}</div></div>
  <div class="card"><div class="cl">Sur scène</div><div class="cv">${partList.filter(p=>p.permissions?.canPublish||p.permissions?.roomAdmin).length}</div></div>
  <div class="card"><div class="cl">Début</div><div class="cv">${fmtClock(streamStartTime)}</div></div>
  <div class="card"><div class="cl">Spectateurs (peak)</div><div class="cv">${viewerCount} <span style="font-size:11px;color:#64748b">(max ${peakViewers})</span></div></div>
  <div class="card"><div class="cl">Messages</div><div class="cv">${chatMessages.length}</div></div>
  <div class="card"><div class="cl">Réactions</div><div class="cv">${reactions.length}</div></div>
  <div class="card"><div class="cl">Mains levées</div><div class="cv">${handRaisedIds.size}</div></div>
  <div class="card"><div class="cl">Exporté à</div><div class="cv" style="font-size:11px">${fmtClock(now)}</div></div>
</div>
<div class="stitle">Détail par participant</div>
<table><thead><tr><th>#</th><th>Nom</th><th>Rôle</th><th>Tps parole</th><th>Messages</th><th>Tps total</th><th>Sessions</th></tr></thead><tbody>${rows}</tbody></table>
${sessionRows?`<div class="stitle">Historique de présence</div><table><thead><tr><th>Session</th><th>Connexion</th><th>Déconnexion</th><th>Durée</th></tr></thead><tbody>${sessionRows}</tbody></table>`:''}
<div class="footer">Généré le ${now.toLocaleString('fr-FR')} · JokkoLive Analytics</div>
</div></body></html>`;

  const win = window.open('','_blank');
  if (!win) return;
  win.document.write(html); win.document.close();
  setTimeout(() => win.print(), 600);
}

// ── Composant principal ───────────────────────────────────────
export default function StreamStatsPanel({ onClose }) {
  const { participants, chatMessages, handRaisedIds, viewerCount, reactions, streamStartTime, roomName, speakerIds } = useStream();
  const timer = useStreamTimer();

  const [peakViewers,         setPeakViewers]         = useState(0);
  const [nowMs,               setNowMs]               = useState(Date.now());
  const [speakTime,           setSpeakTime]           = useState({});
  const [participantSessions, setParticipantSessions] = useState({});
  const speakTimerRef = useRef({});

  useEffect(() => { const t=setInterval(()=>setNowMs(Date.now()),1000); return ()=>clearInterval(t); }, []);
  useEffect(() => { setPeakViewers(p=>Math.max(p,viewerCount)); }, [viewerCount]);

  useEffect(() => {
    const now=Date.now();
    speakerIds.forEach(id => { if (!speakTimerRef.current[id]) speakTimerRef.current[id]={start:now,accumulated:speakTime[id]||0}; });
    Object.keys(speakTimerRef.current).forEach(id => {
      if (!speakerIds.has(id)) { const e=speakTimerRef.current[id]; setSpeakTime(p=>({...p,[id]:e.accumulated+(now-e.start)})); delete speakTimerRef.current[id]; }
    });
  }, [speakerIds]);

  useEffect(() => {
    const t=setInterval(()=>{
      const now=Date.now(), u={};
      Object.entries(speakTimerRef.current).forEach(([id,e])=>{ u[id]=e.accumulated+(now-e.start); });
      if (Object.keys(u).length>0) setSpeakTime(p=>({...p,...u}));
    },500);
    return ()=>clearInterval(t);
  }, []);

  useEffect(() => {
    const ids=new Set(participants.keys());
    setParticipantSessions(prev=>{
      const next={...prev};
      ids.forEach(id=>{
        if (!next[id]) next[id]=[{joinTime:Date.now(),leaveTime:null}];
        else if (next[id][next[id].length-1]?.leaveTime!==null) next[id]=[...next[id],{joinTime:Date.now(),leaveTime:null}];
      });
      Object.keys(next).forEach(id=>{
        if (!ids.has(id)){ const last=next[id][next[id].length-1]; if(last?.leaveTime===null) next[id]=[...next[id].slice(0,-1),{...last,leaveTime:Date.now()}]; }
      });
      return next;
    });
  }, [participants]);

  const partList=Array.from(participants.values()).filter(Boolean);
  const totalSpk=Object.values(speakTime).reduce((s,v)=>s+v,0);
  const maxSpk=Math.max(...Object.values(speakTime),1);
  const totalMsgs=chatMessages.length, totalReact=reactions.length;
  const activeSpk=partList.filter(p=>(speakTime[p.identity]||0)>0).length;

  const msgCounts={};
  chatMessages.forEach(m=>{ msgCounts[m.from]=(msgCounts[m.from]||0)+1; });

  const topChatters=partList.map(p=>({name:p.name||p.identity,count:msgCounts[p.name||p.identity]||0})).sort((a,b)=>b.count-a.count).slice(0,5);
  let topSpeaker=null, topTime=0;
  partList.forEach(p=>{ const t=speakTime[p.identity]||0; if(t>topTime){topTime=t;topSpeaker=p.name||p.identity;} });

  const engagementScore=partList.length>0?Math.min(100,Math.round((totalMsgs*5+handRaisedIds.size*10+(totalSpk>0?30:0))/Math.max(partList.length,1))):0;
  const perfParticipation=partList.length>0?Math.round((activeSpk/partList.length)*100):0;
  const perfEquity=(() => {
    if(partList.length<2)return 100;
    const times=partList.map(p=>speakTime[p.identity]||0);
    const avg=times.reduce((s,v)=>s+v,0)/times.length;
    if(avg===0)return 0;
    const cv=Math.sqrt(times.reduce((s,v)=>s+(v-avg)**2,0)/times.length)/avg;
    return Math.max(0,Math.round((1-Math.min(cv,1))*100));
  })();
  const perfChat=partList.length>0?Math.min(100,Math.round((totalMsgs/(partList.length*3))*100)):0;

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#0c1632'}}>

      {/* Header */}
      <div style={{flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:30,height:30,borderRadius:9,background:'rgba(37,99,235,0.18)',border:'1px solid rgba(37,99,235,0.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <IcoActivity color="#60a5fa" size={15}/>
          </div>
          <div>
            <span style={{color:'#fff',fontWeight:700,fontSize:13,display:'block'}}>Tableau de bord</span>
            <span style={{color:'rgba(255,255,255,0.3)',fontSize:10}}>Analytique en temps réel · {roomName}</span>
          </div>
          <span style={{background:'rgba(239,68,68,0.15)',color:'#f87171',fontSize:9,fontWeight:800,padding:'2px 7px',borderRadius:99,border:'1px solid rgba(239,68,68,0.25)',marginLeft:4}}>HÔTE</span>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>doExportPDF({partList,chatMessages,msgCounts,speakTime,handRaisedIds,viewerCount,peakViewers,reactions,streamStartTime,roomName,timer,participantSessions,nowMs})}
            style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:9,border:'1px solid rgba(37,99,235,0.4)',background:'rgba(37,99,235,0.15)',color:'#60a5fa',fontSize:11,fontWeight:700,cursor:'pointer'}}>
            <IcoDownload color="#60a5fa" size={13}/> PDF
          </button>
          <button onClick={onClose} style={{width:28,height:28,borderRadius:8,border:'none',background:'rgba(255,255,255,0.07)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <IcoX/>
          </button>
        </div>
      </div>

      {/* Corps scrollable */}
      <div style={{flex:1,overflowY:'auto',padding:'14px 16px',display:'flex',flexDirection:'column',gap:20,minHeight:0}}>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <MetricCard icon={IcoClock}    label="Durée"        value={timer}                   color="#2563eb" sub={streamStartTime?`Démarré ${fmtClock(streamStartTime)}`:''} />
          <MetricCard icon={IcoUsers}    label="Spectateurs"  value={viewerCount}             color="#0891b2" sub={`Peak : ${peakViewers}`} />
          <MetricCard icon={IcoMsg}      label="Messages"     value={totalMsgs}               color="#059669" sub={`${partList.length} sur scène`} />
          <MetricCard icon={IcoTrend}    label="Réactions"    value={totalReact}              color="#7c3aed" sub="Emojis envoyés" />
          <MetricCard icon={IcoHand}     label="Mains levées" value={handRaisedIds.size}      color="#b45309" sub="Demandes parole" />
          <MetricCard icon={IcoActivity} label="Engagement"   value={`${engagementScore}/100`} color="#be185d" sub={engagementScore>60?'Très actif 🔥':engagementScore>30?'Modéré':'Faible'} />
        </div>

        {/* Temps de parole */}
        <div>
          <SectionTitle icon={IcoMic} label="Temps de parole (scène)" color="#2563eb"/>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {partList.length===0
              ? <p style={{color:'rgba(255,255,255,0.25)',fontSize:12,textAlign:'center',padding:'12px 0'}}>Aucun participant sur scène</p>
              : partList.slice().sort((a,b)=>(speakTime[b.identity]||0)-(speakTime[a.identity]||0)).map((p,i)=>{
                  const name=p.name||p.identity||'?', spk=speakTime[p.identity]||0;
                  const pct=totalSpk>0?Math.round((spk/totalSpk)*100):0, color=colorFor(name);
                  const isTalking=speakerIds.has(p.identity);
                  return (
                    <div key={p.identity} style={{display:'flex',alignItems:'center',gap:8}}>
                      {i===0&&topTime>0?<span style={{color:'#f59e0b',flexShrink:0,fontSize:12}}>★</span>
                        :<span style={{width:13,color:'rgba(255,255,255,0.2)',fontSize:10,flexShrink:0,textAlign:'center'}}>{i+1}</span>}
                      <div style={{position:'relative',flexShrink:0}}>
                        <div style={{width:26,height:26,borderRadius:'50%',background:color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff'}}>
                          {name.slice(0,2).toUpperCase()}
                        </div>
                        {isTalking&&<div style={{position:'absolute',bottom:-1,right:-1,width:8,height:8,borderRadius:'50%',background:'#22c55e',border:'1.5px solid #0c1632',animation:'spkPulse 1s infinite'}}/>}
                      </div>
                      <span style={{color:'#fff',fontSize:11,fontWeight:600,minWidth:80,maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</span>
                      <Bar value={spk} max={maxSpk} color={color}/>
                      <span style={{color:'rgba(255,255,255,0.45)',fontSize:10,minWidth:34,textAlign:'right'}}>{fmt(spk)}</span>
                      <span style={{color,fontSize:10,fontWeight:700,minWidth:28,textAlign:'right'}}>{pct}%</span>
                    </div>
                  );
                })
            }
          </div>
        </div>

        {/* Historique présence */}
        <div>
          <SectionTitle icon={IcoClock} label="Historique de présence" color="#0891b2"/>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {partList.length===0
              ? <p style={{color:'rgba(255,255,255,0.2)',fontSize:12,textAlign:'center',padding:'12px 0'}}>Aucun historique</p>
              : partList.map(p=>{
                  const name=p.name||p.identity||'?', color=colorFor(name);
                  const sessions=participantSessions[p.identity]||[];
                  const isOnline=sessions.length>0&&!sessions[sessions.length-1].leaveTime;
                  const totalMs=totalSessionMs(sessions,nowMs);
                  return (
                    <div key={p.identity} style={{borderRadius:12,padding:'10px 12px',background:'rgba(255,255,255,0.03)',border:`1px solid ${isOnline?'rgba(34,197,94,0.2)':'rgba(255,255,255,0.07)'}`}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:sessions.length>0?8:0}}>
                        <div style={{width:24,height:24,borderRadius:'50%',background:color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff',flexShrink:0}}>{name.slice(0,2).toUpperCase()}</div>
                        <span style={{color:'#fff',fontSize:12,fontWeight:600,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</span>
                        <div style={{display:'flex',alignItems:'center',gap:4,padding:'2px 7px',borderRadius:99,background:isOnline?'rgba(34,197,94,0.1)':'rgba(255,255,255,0.05)',border:`1px solid ${isOnline?'rgba(34,197,94,0.25)':'rgba(255,255,255,0.08)'}`}}>
                          <div style={{width:5,height:5,borderRadius:'50%',background:isOnline?'#4ade80':'rgba(255,255,255,0.2)',animation:isOnline?'spkPulse 1.5s infinite':'none'}}/>
                          <span style={{fontSize:9,fontWeight:700,color:isOnline?'#4ade80':'rgba(255,255,255,0.3)'}}>{isOnline?'En ligne':'Déconnecté'}</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:3,color:'rgba(255,255,255,0.4)',fontSize:10}}>
                          <IcoClock color="rgba(255,255,255,0.35)" size={10}/><span style={{fontWeight:700}}>{fmt(totalMs)}</span>
                        </div>
                        {sessions.length>1&&<span style={{fontSize:9,fontWeight:700,padding:'1px 6px',borderRadius:99,background:'rgba(245,158,11,0.1)',color:'#f59e0b',border:'1px solid rgba(245,158,11,0.2)'}}>{sessions.length} sessions</span>}
                      </div>
                      {sessions.length>0&&(
                        <div style={{display:'flex',flexDirection:'column',gap:4,paddingLeft:32}}>
                          {sessions.map((s,idx)=>(
                            <div key={idx} style={{display:'flex',alignItems:'center',gap:6,fontSize:10}}>
                              <span style={{color:'rgba(255,255,255,0.18)',minWidth:14}}>#{idx+1}</span>
                              <div style={{display:'flex',alignItems:'center',gap:3}}><IcoLogIn/><span style={{color:'#4ade80',fontWeight:600}}>{fmtClockSec(s.joinTime)}</span></div>
                              <span style={{color:'rgba(255,255,255,0.15)'}}>→</span>
                              {s.leaveTime
                                ?<div style={{display:'flex',alignItems:'center',gap:3}}><IcoLogOut/><span style={{color:'#f87171',fontWeight:600}}>{fmtClockSec(s.leaveTime)}</span></div>
                                :<div style={{display:'flex',alignItems:'center',gap:3}}><div style={{width:5,height:5,borderRadius:'50%',background:'#4ade80',animation:'spkPulse 1.5s infinite'}}/><span style={{color:'#4ade80'}}>En cours</span></div>
                              }
                              <span style={{color:'rgba(255,255,255,0.2)'}}>({fmt((s.leaveTime||nowMs)-s.joinTime)})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
            }
          </div>
        </div>

        {/* Top chatters */}
        {topChatters.filter(t=>t.count>0).length>0&&(
          <div>
            <SectionTitle icon={IcoMsg} label="Top participants (chat)" color="#059669"/>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {topChatters.filter(t=>t.count>0).map((t,i)=>(
                <div key={t.name} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 10px',borderRadius:10,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)'}}>
                  <span style={{width:22,height:22,borderRadius:'50%',background:colorFor(t.name),display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:9,fontWeight:800,flexShrink:0}}>{(t.name||'?').slice(0,2).toUpperCase()}</span>
                  <span style={{flex:1,fontSize:12,color:'rgba(255,255,255,0.8)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.name}</span>
                  <Bar value={t.count} max={Math.max(...topChatters.map(x=>x.count),1)} color={colorFor(t.name)}/>
                  <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',minWidth:22,textAlign:'right'}}>{t.count}</span>
                  {i===0&&<span style={{fontSize:11,color:'#fbbf24'}}>★</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Engagement individuel */}
        <div>
          <SectionTitle icon={IcoTrend} label="Engagement individuel" color="#059669"/>
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {partList.length===0
              ?<p style={{color:'rgba(255,255,255,0.2)',fontSize:12,textAlign:'center',padding:'12px 0'}}>Aucun participant</p>
              :partList.map(p=>{
                const name=p.name||p.identity||'?', msgs=msgCounts[p.name||p.identity]||0;
                const spk=speakTime[p.identity]||0, color=colorFor(name);
                const score=Math.min(10,Math.round(msgs*0.5+(spk>0?3:0)));
                return (
                  <div key={p.identity} style={{display:'flex',alignItems:'center',gap:9,padding:'9px 11px',borderRadius:11,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
                    <div style={{width:26,height:26,borderRadius:'50%',background:color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff',flexShrink:0}}>{name.slice(0,2).toUpperCase()}</div>
                    <span style={{color:'#fff',fontSize:11,fontWeight:600,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</span>
                    <div style={{display:'flex',gap:12,alignItems:'center',flexShrink:0}}>
                      <div style={{textAlign:'center'}}><div style={{color:'#60a5fa',fontSize:12,fontWeight:700}}>{msgs}</div><div style={{color:'rgba(255,255,255,0.25)',fontSize:9}}>msgs</div></div>
                      <div style={{textAlign:'center'}}><div style={{color:'#4ade80',fontSize:12,fontWeight:700}}>{fmt(spk)}</div><div style={{color:'rgba(255,255,255,0.25)',fontSize:9}}>parole</div></div>
                      <div style={{display:'flex',alignItems:'center',gap:2}}>
                        {Array.from({length:10}).map((_,j)=><div key={j} style={{width:4,height:12,borderRadius:3,background:j<score?color:'rgba(255,255,255,0.08)'}}/>)}
                      </div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* Performance */}
        <div>
          <SectionTitle icon={IcoPercent} label="Performance du live" color="#7c3aed"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[
              {label:'Participation vocale',  value:perfParticipation, color:'#2563eb'},
              {label:'Répartition équitable', value:perfEquity,        color:'#059669'},
              {label:'Interactivité chat',    value:perfChat,          color:'#0891b2'},
              {label:'Score global',          value:engagementScore,   color:'#7c3aed'},
            ].map(item=>(
              <div key={item.label} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:11,padding:'11px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <span style={{color:'rgba(255,255,255,0.4)',fontSize:10}}>{item.label}</span>
                  <span style={{color:item.color,fontSize:13,fontWeight:700}}>{item.value}%</span>
                </div>
                <Bar value={item.value} max={100} color={item.color}/>
              </div>
            ))}
          </div>
        </div>

        {/* Top speaker */}
        {topSpeaker&&topTime>0&&(
          <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 15px',borderRadius:13,background:'rgba(245,158,11,0.07)',border:'1px solid rgba(245,158,11,0.2)'}}>
            <IcoAward/>
            <div>
              <p style={{color:'#f59e0b',fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:2}}>Orateur principal</p>
              <p style={{color:'#fff',fontSize:13,fontWeight:700}}>{topSpeaker}</p>
              <p style={{color:'rgba(255,255,255,0.4)',fontSize:10}}>{fmt(topTime)} de prise de parole</p>
            </div>
          </div>
        )}

        {/* Info connexion */}
        <div style={{borderRadius:12,padding:'12px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[['Room ID',roomName],['Démarré',streamStartTime?fmtClock(streamStartTime):'--'],['Durée',timer],['Spectateurs',`${viewerCount} (peak: ${peakViewers})`]].map(([k,v])=>(
              <div key={k}>
                <p style={{margin:0,fontSize:9,color:'rgba(255,255,255,0.3)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:2}}>{k}</p>
                <p style={{margin:0,fontSize:12,color:'rgba(255,255,255,0.7)',fontFamily:k==='Room ID'?'monospace':'inherit'}}>{v}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
      <style>{`::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:99px}@keyframes spkPulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}