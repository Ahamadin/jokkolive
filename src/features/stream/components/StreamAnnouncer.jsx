// src/features/stream/components/StreamAnnouncer.jsx
// ─────────────────────────────────────────────────────────────
// Toasts texte style Google Meet — discrets, rapides (2.5s),
// empilés en bas à droite, disparaissent tout seuls
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, memo } from 'react';

const CONFIGS = {
  join:   { bg: 'rgba(16,40,28,0.95)',  border: 'rgba(74,222,128,0.3)',  dot: '#4ade80'},
  leave:  { bg: 'rgba(40,14,14,0.95)', border: 'rgba(248,113,113,0.25)', dot: '#f87171'},
  hand:   { bg: 'rgba(40,28,8,0.95)',  border: 'rgba(251,191,36,0.3)',   dot: '#fbbf24'},
  screen: { bg: 'rgba(8,24,50,0.95)',  border: 'rgba(96,165,250,0.28)',  dot: '#60a5fa'},
  poll:   { bg: 'rgba(20,12,40,0.95)', border: 'rgba(167,139,250,0.28)', dot: '#a78bfa'},
  file:   { bg: 'rgba(8,28,36,0.95)',  border: 'rgba(56,189,248,0.25)',  dot: '#38bdf8'},
  info:   { bg: 'rgba(10,16,34,0.95)', border: 'rgba(255,255,255,0.1)',  dot: 'rgba(255,255,255,0.4)'},
};

const Toast = memo(function Toast({ toast, onRemove }) {
  const cfg = CONFIGS[toast.type] || CONFIGS.info;

  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 2500);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '9px 14px',
      borderRadius: 12,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      backdropFilter: 'blur(16px)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      animation: 'toastIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      maxWidth: 280,
      pointerEvents: 'auto',
    }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{cfg.emoji}</span>
      <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: 12, fontWeight: 500, lineHeight: 1.4 }}>
        {toast.text}
      </span>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: cfg.dot, flexShrink: 0, marginLeft: 2,
        animation: 'dotFade 2.5s ease forwards',
      }}/>
    </div>
  );
});

export default function StreamAnnouncer() {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const toast = e.detail;
      setToasts(prev => {
        // Max 4 toasts simultanés
        const next = [...prev.slice(-3), toast];
        return next;
      });
    };
    window.addEventListener('stream:announce', handler);
    return () => window.removeEventListener('stream:announce', handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: 16, right: 16,
      zIndex: 50,
      display: 'flex', flexDirection: 'column-reverse', gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onRemove={removeToast} />
      ))}
      <style>{`
        @keyframes toastIn {
          from { opacity:0; transform:translateX(16px) scale(0.95); }
          to   { opacity:1; transform:translateX(0)    scale(1); }
        }
        @keyframes dotFade {
          0%,60% { opacity:1; }
          100%   { opacity:0.2; }
        }
      `}</style>
    </div>
  );
}