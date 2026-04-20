// src/features/stream/components/ChatPanel.jsx
// Chat style YouTube Live / Twitch
// ✅ Emoji picker complet (comme les plateformes de streaming)
// ✅ Icônes SVG — pas de lucide-react
import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useStream } from '../context/StreamContext.jsx';
import { ROLE } from '../../../config.js';

// ── Icônes SVG ────────────────────────────────────────────────
const IcoMsg = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IcoUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" style={{width:12,height:12}}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IcoClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IcoSend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IcoChevDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const IcoSmile = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
    <line x1="9" y1="9" x2="9.01" y2="9"/>
    <line x1="15" y1="9" x2="15.01" y2="9"/>
  </svg>
);

// ── Réactions rapides (broadcast à tous) ─────────────────────
const REACTIONS = ['👍','❤️','🔥','😂','🎉','😮','👏','💯','🙌','⚡'];

// ── Emojis pour l'input — style Twitch/YouTube ───────────────
const EMOJI_CATEGORIES = {
  'Populaires': ['😀','😂','🥰','😍','🤩','😎','🥳','😜','🤔','😏','😊','🙂','😇','🤗','😄','😁','😆','🤣','😅','😈'],
  'Réactions':  ['👍','👎','❤️','🔥','💯','⚡','✨','💫','🎉','🎊','🥇','🏆','💪','🙌','👏','🤝','🫶','💥','🚀','⭐'],
  'Visages':    ['😭','😱','😡','🤯','🥺','😴','🤤','🤢','🤮','😵','🤕','😷','🤒','😫','😩','😤','😠','🤬','👿','💀'],
  'Gestes':     ['👋','🤚','✋','🖐️','👌','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊'],
  'Objets':     ['🎮','🎵','🎶','🎸','🎤','🎧','🎨','📱','💻','⌨️','🖥️','📷','🎥','📺','🔔','📢','📣','💡','🔑','🏠'],
  'Nature':     ['🌟','⭐','🌙','☀️','🌈','⛅','🌊','🌺','🌸','🌻','🌹','🍀','🌿','🍃','🌴','🦁','🐯','🦊','🐺','🦅'],
  'Drapeaux':   [
    '🏴','🏳️','🚩','🏁','🎌',
    // Afrique de l'Ouest (priorité Sénégal)
    '🇸🇳','🇲🇱','🇬🇳','🇬🇲','🇬🇼','🇨🇻','🇲🇷','🇸🇱','🇱🇷','🇨🇮',
    '🇧🇫','🇳🇪','🇳🇬','🇬🇭','🇧🇯','🇹🇬',
    // Afrique du Nord
    '🇲🇦','🇩🇿','🇹🇳','🇱🇾','🇪🇬','🇸🇩','🇸🇸','🇲🇷',
    // Afrique centrale & australe
    '🇨🇲','🇬🇦','🇨🇬','🇨🇩','🇦🇴','🇿🇦','🇰🇪','🇪🇹','🇺🇬','🇹🇿','🇷🇼','🇲🇬','🇲🇿','🇿🇲','🇿🇼',
    // Europe
    '🇫🇷','🇬🇧','🇩🇪','🇪🇸','🇮🇹','🇵🇹','🇧🇪','🇳🇱','🇨🇭','🇸🇪','🇳🇴','🇩🇰','🇵🇱','🇷🇺','🇹🇷','🇬🇷',
    // Amériques
    '🇺🇸','🇨🇦','🇲🇽','🇧🇷','🇦🇷','🇨🇴','🇨🇱','🇵🇪','🇯🇲','🇨🇺','🇭🇹',
    // Asie & Océanie
    '🇯🇵','🇨🇳','🇰🇷','🇮🇳','🇸🇦','🇦🇪','🇮🇩','🇦🇺',
  ],
};

// ── Avatar coloré ─────────────────────────────────────────────
const COLORS = ['#1a2b5c','#2563eb','#7c3aed','#0891b2','#065f46','#92400e','#be185d','#c2410c','#1d4ed8','#6d28d9'];
function getColor(name = '') {
  let c = 0;
  for (let i = 0; i < name.length; i++) c = (c + name.charCodeAt(i)) % COLORS.length;
  return COLORS[c];
}
function Avatar({ name, size = 22 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: getColor(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 800, fontSize: size * 0.4,
      flexShrink: 0, userSelect: 'none',
    }}>
      {(name || '?').slice(0, 2).toUpperCase()}
    </div>
  );
}

// ── Ligne de message ──────────────────────────────────────────
const ChatMsg = memo(function ChatMsg({ msg, isFirst }) {
  const hostColor    = '#fbbf24';
  const speakerColor = '#34d399';
  const meColor      = '#60a5fa';
  const nameColor    = msg.isHost ? hostColor : msg.isSpeaker ? speakerColor : msg.isMe ? meColor : 'rgba(255,255,255,0.65)';
  const badge        = msg.isHost ? '👑' : msg.isSpeaker ? '🎤' : null;

  return (
    <div
      style={{ display:'flex', gap:8, padding: isFirst ? '7px 12px 2px' : '2px 12px', alignItems:'flex-start', transition:'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {isFirst ? <Avatar name={msg.from} size={22} /> : <div style={{ width:22, flexShrink:0 }}/>}
      <div style={{ flex:1, minWidth:0 }}>
        {isFirst && (
          <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, fontWeight:700, color:nameColor }}>
              {badge && <>{badge} </>}{msg.from}
            </span>
            {msg.isMe && (
              <span style={{ fontSize:9, color:'rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.08)', padding:'1px 5px', borderRadius:99 }}>Vous</span>
            )}
            <span style={{ fontSize:9, color:'rgba(255,255,255,0.2)', marginLeft:'auto' }}>
              {new Date(msg.ts).toLocaleTimeString('fr', { hour:'2-digit', minute:'2-digit' })}
            </span>
          </div>
        )}
        <p style={{ margin:0, fontSize:13, color: msg.isMe ? '#e2e8f0' : 'rgba(255,255,255,0.85)', lineHeight:1.45, wordBreak:'break-word' }}>
          {msg.text}
        </p>
      </div>
    </div>
  );
});

// Icônes courtes pour les onglets
const TAB_ICONS = {
  'Populaires': '😊',
  'Réactions':  '👍',
  'Visages':    '😭',
  'Gestes':     '👋',
  'Objets':     '🎮',
  'Nature':     '🌿',
  'Drapeaux':   '🏳️',
};

// ── Picker emoji ──────────────────────────────────────────────
function EmojiPicker({ onSelect, onClose }) {
  const [activeTab, setActiveTab] = useState('Populaires');
  const categories = Object.keys(EMOJI_CATEGORIES);

  return (
    <div style={{
      position: 'absolute', bottom: '100%', right: 0, marginBottom: 6,
      width: 310, background: '#0f1d3e',
      border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
      boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
      zIndex: 100, animation: 'pickerIn 0.15s ease',
      overflow: 'hidden',
    }}>
      {/* Onglets catégories — icône emoji + label */}
      <div style={{
        display: 'flex', overflowX: 'auto', padding: '8px 6px 0',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        gap: 2,
        scrollbarWidth: 'none',
      }}>
        {categories.map(cat => (
          <button key={cat}
            onClick={() => setActiveTab(cat)}
            title={cat}
            style={{
              flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '5px 8px', borderRadius: '8px 8px 0 0',
              border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
              background: activeTab === cat ? 'rgba(37,99,235,0.25)' : 'transparent',
              color: activeTab === cat ? '#60a5fa' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.1s',
              borderBottom: activeTab === cat ? '2px solid #2563eb' : '2px solid transparent',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 14 }}>{TAB_ICONS[cat]}</span>
            <span style={{ display: cat === 'Drapeaux' ? 'inline' : 'none', fontSize: 10 }}>
              {cat === 'Drapeaux' ? 'Drapeaux' : ''}
            </span>
          </button>
        ))}
      </div>

      {/* Label catégorie active */}
      <div style={{
        padding: '6px 10px 2px',
        fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
        color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
      }}>
        {activeTab}
      </div>

      {/* Grille emojis */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: activeTab === 'Drapeaux' ? 'repeat(8, 1fr)' : 'repeat(10, 1fr)',
        gap: 2, padding: '4px 8px 10px', maxHeight: 200, overflowY: 'auto',
      }}>
        {EMOJI_CATEGORIES[activeTab].map((emoji, i) => (
          <button key={`${emoji}-${i}`}
            onClick={() => onSelect(emoji)}
            style={{
              width: activeTab === 'Drapeaux' ? 34 : 28,
              height: activeTab === 'Drapeaux' ? 34 : 28,
              borderRadius: 6, border: 'none',
              cursor: 'pointer', background: 'transparent',
              fontSize: activeTab === 'Drapeaux' ? 20 : 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.1s, transform 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {emoji}
          </button>
        ))}
      </div>

      <style>{`@keyframes pickerIn { from{opacity:0;transform:scale(0.95) translateY(6px)} to{opacity:1;transform:scale(1) translateY(0)} }`}</style>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────
export default function ChatPanel() {
  const {
    chatMessages, sendChat, sendReaction,
    setActivePanel, myRole, viewerCount,
  } = useStream();

  const [input,      setInput]      = useState('');
  const [unread,     setUnread]     = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const bottomRef  = useRef(null);
  const listRef    = useRef(null);
  const inputRef   = useRef(null);
  const pickerRef  = useRef(null);
  const prevCount  = useRef(0);

  const isAtBottom = useCallback(() => {
    const el = listRef.current;
    return el ? el.scrollHeight - el.scrollTop - el.clientHeight < 100 : true;
  }, []);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnread(0);
  }, []);

  useEffect(() => {
    if (chatMessages.length === prevCount.current) return;
    prevCount.current = chatMessages.length;
    if (isAtBottom()) scrollToBottom();
    else setUnread(n => n + 1);
  }, [chatMessages, isAtBottom, scrollToBottom]);

  // Fermer le picker si clic dehors
  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    if (showPicker) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPicker]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendChat(input.trim());
    setInput('');
    setShowPicker(false);
    setTimeout(scrollToBottom, 60);
  };

  const handleEmojiSelect = (emoji) => {
    setInput(prev => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#0c1632' }}>

      {/* ── Header ── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'11px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <IcoMsg/>
          <span style={{ color:'#fff', fontWeight:700, fontSize:13 }}>Chat en direct</span>
          <span style={{
            background:'#ef4444', color:'#fff', fontSize:9,
            fontWeight:800, padding:'2px 7px', borderRadius:99,
          }}>
            LIVE
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <IcoUsers/>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontWeight:600 }}>{viewerCount}</span>
          </div>
          <span style={{ color:'rgba(255,255,255,0.25)', fontSize:11 }}>{chatMessages.length}</span>
          <button
            onClick={() => setActivePanel('chat')}
            style={{ width:26,height:26,borderRadius:8,border:'none',background:'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,0.4)',transition:'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          >
            <IcoClose/>
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div ref={listRef} onScroll={() => { if (isAtBottom()) setUnread(0); }}
           style={{ flex:1, overflowY:'auto', minHeight:0, position:'relative' }}>

        {chatMessages.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 16px' }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:12, opacity:0.15 }}>
              <IcoMsg/>
            </div>
            <p style={{ color:'rgba(255,255,255,0.25)', fontSize:12, margin:0, lineHeight:1.7 }}>
              Aucun message pour l'instant.<br/>
              <span style={{ color:'rgba(255,255,255,0.15)', fontSize:11 }}>Soyez le premier à écrire !</span>
            </p>
          </div>
        )}

        {chatMessages.map((msg, idx) => {
          const isFirst = idx === 0
            || chatMessages[idx-1].from !== msg.from
            || (msg.ts - chatMessages[idx-1].ts) > 120000;
          return <ChatMsg key={msg.id} msg={msg} isFirst={isFirst} />;
        })}

        <div ref={bottomRef} style={{ height:4 }}/>
      </div>

      {/* ── Bouton nouveaux messages ── */}
      {unread > 0 && (
        <div style={{ position:'relative', display:'flex', justifyContent:'center' }}>
          <button onClick={scrollToBottom}
            style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'5px 14px', borderRadius:99, border:'none', cursor:'pointer',
              background:'#1d4ed8', color:'#fff', fontSize:11, fontWeight:700,
              boxShadow:'0 4px 16px rgba(37,99,235,0.5)',
              position:'absolute', bottom:8, zIndex:10,
            }}>
            <IcoChevDown/>
            {unread} nouveau{unread > 1 ? 'x' : ''} message{unread > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* ── Réactions rapides (broadcast) style Twitch ── */}
      <div style={{
        display:'flex', gap:1, padding:'6px 10px',
        borderTop:'1px solid rgba(255,255,255,0.06)',
        overflowX:'auto', flexShrink:0,
      }}>
        {REACTIONS.map(e => (
          <button key={e} onClick={() => sendReaction(e)}
            style={{
              width:30, height:30, borderRadius:7, border:'none', cursor:'pointer',
              background:'transparent', fontSize:14,
              display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink:0, transition:'background 0.1s, transform 0.1s',
            }}
            onMouseEnter={e2 => { e2.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e2.currentTarget.style.transform = 'scale(1.2)'; }}
            onMouseLeave={e2 => { e2.currentTarget.style.background = 'transparent'; e2.currentTarget.style.transform = 'scale(1)'; }}
          >
            {e}
          </button>
        ))}
      </div>

      {/* ── Zone de saisie + bouton emoji ── */}
      <div style={{ padding:'8px 10px 12px', flexShrink:0 }}>
        <div style={{
          display:'flex', gap:6, alignItems:'flex-end',
          borderRadius:14, background:'rgba(255,255,255,0.07)',
          border:'1px solid rgba(255,255,255,0.1)',
          padding:'2px 4px 2px 10px', transition:'border-color 0.15s',
          position:'relative',
        }}
          onFocusCapture={e => e.currentTarget.style.borderColor = 'rgba(37,99,235,0.5)'}
          onBlurCapture={e  => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={myRole === ROLE.VIEWER ? 'Envoyer un message…' : 'Écrire un message…'}
            maxLength={300}
            rows={1}
            style={{
              flex:1, background:'transparent', border:'none', outline:'none',
              padding:'9px 0', fontSize:13, color:'#fff', resize:'none',
              fontFamily:'inherit', lineHeight:1.4, maxHeight:80,
            }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px'; }}
          />

          {/* Bouton emoji picker */}
          <div ref={pickerRef} style={{ position:'relative', flexShrink:0, alignSelf:'flex-end', marginBottom:4 }}>
            <button
              onClick={() => setShowPicker(v => !v)}
              title="Emojis"
              style={{
                width:30, height:30, borderRadius:8, border:'none', cursor:'pointer',
                background: showPicker ? 'rgba(37,99,235,0.3)' : 'transparent',
                display:'flex', alignItems:'center', justifyContent:'center',
                color: showPicker ? '#60a5fa' : 'rgba(255,255,255,0.45)',
                transition:'all 0.15s',
              }}
              onMouseEnter={e => { if (!showPicker) e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
              onMouseLeave={e => { if (!showPicker) e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
            >
              <IcoSmile/>
            </button>
            {showPicker && (
              <EmojiPicker
                onSelect={handleEmojiSelect}
                onClose={() => setShowPicker(false)}
              />
            )}
          </div>

          {/* Bouton envoyer */}
          <button onClick={handleSend} disabled={!input.trim()}
            style={{
              width:34, height:34, borderRadius:10, border:'none',
              cursor: input.trim() ? 'pointer' : 'default',
              background: input.trim() ? '#2563eb' : 'rgba(255,255,255,0.05)',
              display:'flex', alignItems:'center', justifyContent:'center',
              marginBottom:2, transition:'background 0.15s', flexShrink:0,
              color: input.trim() ? '#fff' : 'rgba(255,255,255,0.25)',
            }}>
            <IcoSend/>
          </button>
        </div>

        {input.length > 240 && (
          <p style={{ color: input.length >= 300 ? '#f87171' : 'rgba(255,255,255,0.3)', fontSize:10, margin:'3px 2px 0', textAlign:'right' }}>
            {input.length}/300
          </p>
        )}
      </div>

      <style>{`
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:99px; }
      `}</style>
    </div>
  );
}