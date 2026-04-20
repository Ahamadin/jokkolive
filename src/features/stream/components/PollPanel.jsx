// src/features/stream/components/PollPanel.jsx
// Sondages en temps réel — hôte crée, tous votent, résultats live
import { useState, useEffect, useCallback } from 'react';
import { useStream } from '../context/StreamContext.jsx';
import { ROLE } from '../../../config.js';
import { BarChart2, X, Plus, Trash2, Send, CheckCircle2 } from 'lucide-react';

export default function PollPanel() {
  const { myRole, publish, setActivePanel, localParticipant } = useStream();
  const isHost = myRole === ROLE.HOST;

  const [polls,       setPolls]       = useState([]);   // liste sondages
  const [creating,    setCreating]    = useState(false); // formulaire création
  const [question,    setQuestion]    = useState('');
  const [options,     setOptions]     = useState(['', '']);
  const [myVotes,     setMyVotes]     = useState({});    // pollId → optionIndex

  // ── Recevoir événements sondage ───────────────────────────
  useEffect(() => {
    const handlePoll = (e) => {
      const { type, poll, pollId, optionIndex, voterName } = e.detail;

      if (type === 'poll_created') {
        setPolls(prev => {
          if (prev.find(p => p.id === poll.id)) return prev;
          return [...prev, poll];
        });
      }
      if (type === 'poll_vote') {
        setPolls(prev => prev.map(p => {
          if (p.id !== pollId) return p;
          const votes = [...p.votes];
          votes[optionIndex] = (votes[optionIndex] || 0) + 1;
          return { ...p, votes, totalVotes: (p.totalVotes || 0) + 1 };
        }));
      }
      if (type === 'poll_closed') {
        setPolls(prev => prev.map(p => p.id === pollId ? { ...p, closed: true } : p));
      }
    };
    window.addEventListener('stream:poll_event', handlePoll);
    return () => window.removeEventListener('stream:poll_event', handlePoll);
  }, []);

  // ── Créer un sondage ──────────────────────────────────────
  const createPoll = useCallback(async () => {
    const q   = question.trim();
    const opts = options.map(o => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) return;

    const poll = {
      id:         Date.now(),
      question:   q,
      options:    opts,
      votes:      new Array(opts.length).fill(0),
      totalVotes: 0,
      closed:     false,
      createdBy:  localParticipant?.name || 'Hôte',
      ts:         Date.now(),
    };
    setPolls(prev => [...prev, poll]);
    await publish({ type: 'poll_created', poll });
    setQuestion(''); setOptions(['', '']); setCreating(false);
  }, [question, options, publish, localParticipant]);

  // ── Voter ─────────────────────────────────────────────────
  const vote = useCallback(async (pollId, optionIndex) => {
    if (myVotes[pollId] !== undefined) return; // déjà voté
    setMyVotes(prev => ({ ...prev, [pollId]: optionIndex }));
    // Mise à jour locale immédiate
    setPolls(prev => prev.map(p => {
      if (p.id !== pollId) return p;
      const votes = [...p.votes];
      votes[optionIndex] = (votes[optionIndex] || 0) + 1;
      return { ...p, votes, totalVotes: (p.totalVotes || 0) + 1 };
    }));
    await publish({ type: 'poll_vote', pollId, optionIndex, voterName: localParticipant?.name || '?' });
  }, [myVotes, publish, localParticipant]);

  // ── Clôturer sondage (hôte) ───────────────────────────────
  const closePoll = useCallback(async (pollId) => {
    setPolls(prev => prev.map(p => p.id === pollId ? { ...p, closed: true } : p));
    await publish({ type: 'poll_closed', pollId });
  }, [publish]);

  // ── Supprimer sondage (hôte, local) ──────────────────────
  const deletePoll = (pollId) => setPolls(prev => prev.filter(p => p.id !== pollId));

  // ── Calcul % ─────────────────────────────────────────────
  const pct = (votes, total) => total === 0 ? 0 : Math.round((votes / total) * 100);
  const maxVotes = (poll) => Math.max(...poll.votes, 1);

  const BAR_COLORS = ['#2563eb','#7c3aed','#0891b2','#065f46','#92400e'];

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#0c1632' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <BarChart2 size={15} color="rgba(255,255,255,0.5)" />
          <span style={{ color:'#fff', fontWeight:700, fontSize:13 }}>Sondages</span>
          {polls.length > 0 && (
            <span style={{ background:'rgba(37,99,235,0.2)', color:'#60a5fa', fontSize:10, fontWeight:800, padding:'1px 7px', borderRadius:99, border:'1px solid rgba(37,99,235,0.3)' }}>
              {polls.length}
            </span>
          )}
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {isHost && !creating && (
            <button onClick={() => setCreating(true)}
              style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer', background:'rgba(37,99,235,0.2)', color:'#60a5fa', fontSize:11, fontWeight:700 }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(37,99,235,0.35)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(37,99,235,0.2)'}>
              <Plus size={13} /> Créer
            </button>
          )}
          <button onClick={() => setActivePanel('poll')}
            style={{ width:28,height:28,borderRadius:8,border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,0.4)' }}>
            <X size={15} />
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'12px', minHeight:0 }}>

        {/* ── Formulaire création (hôte) ── */}
        {creating && (
          <div style={{ borderRadius:14, padding:'14px', marginBottom:14, background:'rgba(37,99,235,0.1)', border:'1px solid rgba(37,99,235,0.25)' }}>
            <p style={{ color:'#fff', fontWeight:700, fontSize:12, margin:'0 0 10px' }}>Nouveau sondage</p>

            {/* Question */}
            <input value={question} onChange={e=>setQuestion(e.target.value)}
              placeholder="Votre question…"
              style={{ width:'100%', boxSizing:'border-box', borderRadius:8, padding:'8px 10px', fontSize:12, color:'#fff', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', outline:'none', marginBottom:8 }}
            />

            {/* Options */}
            {options.map((opt, i) => (
              <div key={i} style={{ display:'flex', gap:6, marginBottom:6 }}>
                <input value={opt} onChange={e => { const n=[...options]; n[i]=e.target.value; setOptions(n); }}
                  placeholder={`Option ${i+1}`}
                  style={{ flex:1, borderRadius:8, padding:'7px 10px', fontSize:12, color:'#fff', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', outline:'none' }}
                />
                {options.length > 2 && (
                  <button onClick={() => setOptions(options.filter((_,j)=>j!==i))}
                    style={{ width:30,height:30,borderRadius:8,border:'none',cursor:'pointer',background:'rgba(239,68,68,0.15)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <Trash2 size={12} color="#f87171" />
                  </button>
                )}
              </div>
            ))}

            {/* Ajouter option */}
            {options.length < 6 && (
              <button onClick={() => setOptions([...options, ''])}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, border:'1px dashed rgba(255,255,255,0.2)', cursor:'pointer', background:'transparent', color:'rgba(255,255,255,0.4)', fontSize:11, width:'100%', justifyContent:'center', marginBottom:10 }}>
                <Plus size={12} /> Ajouter une option
              </button>
            )}

            {/* Actions */}
            <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
              <button onClick={() => { setCreating(false); setQuestion(''); setOptions(['','']); }}
                style={{ padding:'6px 12px', borderRadius:8, border:'none', cursor:'pointer', background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.5)', fontSize:11 }}>
                Annuler
              </button>
              <button onClick={createPoll} disabled={!question.trim()||options.filter(o=>o.trim()).length<2}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', background:'#2563eb', color:'#fff', fontSize:11, fontWeight:700, opacity: (!question.trim()||options.filter(o=>o.trim()).length<2)?0.4:1 }}>
                <Send size={12} /> Lancer
              </button>
            </div>
          </div>
        )}

        {/* ── Liste sondages ── */}
        {polls.length === 0 && !creating && (
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <BarChart2 size={32} color="rgba(255,255,255,0.15)" style={{ marginBottom:12 }} />
            <p style={{ color:'rgba(255,255,255,0.3)', fontSize:12, margin:0 }}>
              {isHost ? 'Créez un sondage pour l\'audience' : 'Aucun sondage actif'}
            </p>
          </div>
        )}

        {polls.map(poll => {
          const voted    = myVotes[poll.id] !== undefined;
          const showResults = voted || poll.closed || isHost;
          const winnerIdx  = poll.votes.indexOf(Math.max(...poll.votes));

          return (
            <div key={poll.id} style={{ borderRadius:14, padding:'14px', marginBottom:12, background: poll.closed?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.06)', border:`1px solid ${poll.closed?'rgba(255,255,255,0.05)':'rgba(255,255,255,0.1)'}` }}>

              {/* Statut + Question */}
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    {poll.closed
                      ? <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:99, background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.4)' }}>TERMINÉ</span>
                      : <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:99, background:'rgba(34,197,94,0.2)', color:'#4ade80', border:'1px solid rgba(34,197,94,0.3)' }}>EN COURS</span>
                    }
                    <span style={{ color:'rgba(255,255,255,0.3)', fontSize:10 }}>{poll.totalVotes} vote{poll.totalVotes!==1?'s':''}</span>
                  </div>
                  <p style={{ color:'#fff', fontWeight:700, fontSize:13, margin:0, lineHeight:1.4 }}>{poll.question}</p>
                </div>
                {isHost && (
                  <div style={{ display:'flex', gap:4, marginLeft:8, flexShrink:0 }}>
                    {!poll.closed && (
                      <button onClick={() => closePoll(poll.id)} title="Clôturer"
                        style={{ padding:'4px 8px', borderRadius:6, border:'none', cursor:'pointer', background:'rgba(245,158,11,0.2)', color:'#fbbf24', fontSize:10, fontWeight:700 }}>
                        Clôturer
                      </button>
                    )}
                    <button onClick={() => deletePoll(poll.id)} title="Supprimer"
                      style={{ width:26,height:26,borderRadius:6,border:'none',cursor:'pointer',background:'rgba(239,68,68,0.15)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                      <Trash2 size={12} color="#f87171" />
                    </button>
                  </div>
                )}
              </div>

              {/* Options — vote ou résultats */}
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {poll.options.map((opt, i) => {
                  const p      = pct(poll.votes[i]||0, poll.totalVotes);
                  const isWin  = showResults && poll.closed && i === winnerIdx && poll.totalVotes > 0;
                  const isMyV  = myVotes[poll.id] === i;
                  const color  = BAR_COLORS[i % BAR_COLORS.length];

                  return (
                    <div key={i}>
                      {/* Bouton vote si pas encore voté et pas clôturé */}
                      {!showResults && !poll.closed ? (
                        <button onClick={() => vote(poll.id, i)}
                          style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:`1px solid ${color}44`, cursor:'pointer', background:`${color}18`, color:'rgba(255,255,255,0.85)', fontSize:12, textAlign:'left', fontWeight:600, transition:'all 0.15s' }}
                          onMouseEnter={e=>{e.currentTarget.style.background=`${color}30`;e.currentTarget.style.borderColor=`${color}88`;}}
                          onMouseLeave={e=>{e.currentTarget.style.background=`${color}18`;e.currentTarget.style.borderColor=`${color}44`;}}>
                          {opt}
                        </button>
                      ) : (
                        // Barre de résultat
                        <div style={{ position:'relative', borderRadius:10, overflow:'hidden', background:'rgba(255,255,255,0.05)', border:`1px solid ${isWin?color+'66':'rgba(255,255,255,0.08)'}` }}>
                          {/* Barre */}
                          <div style={{ position:'absolute', inset:'0 auto 0 0', width:`${p}%`, background:`${color}30`, borderRadius:10, transition:'width 0.6s ease' }} />
                          <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', gap:8 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, minWidth:0 }}>
                              {isMyV && <CheckCircle2 size={13} color={color} style={{ flexShrink:0 }} />}
                              {isWin && <span style={{ fontSize:11 }}>🏆</span>}
                              <span style={{ fontSize:12, fontWeight: isWin||isMyV?700:500, color: isWin||isMyV?'#fff':'rgba(255,255,255,0.75)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{opt}</span>
                            </div>
                            <span style={{ fontSize:12, fontWeight:700, color: isWin?color:'rgba(255,255,255,0.5)', flexShrink:0 }}>{p}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Résumé post-vote */}
              {voted && !poll.closed && (
                <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11, margin:'8px 0 0', textAlign:'center' }}>
                 Vote enregistré · résultats en direct
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}