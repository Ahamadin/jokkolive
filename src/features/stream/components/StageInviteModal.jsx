// src/features/stream/components/StageInviteModal.jsx
import { useStream } from '../context/StreamContext.jsx';
import { Mic, X } from 'lucide-react';

export default function StageInviteModal() {
  const { pendingInvite, acceptInvite, declineInvite } = useStream();
  if (!pendingInvite) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
         style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
      <div className="stream-card rounded-2xl p-6 max-w-sm w-full text-center shadow-heavy animate-slide-up">
        <div className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/30
                        flex items-center justify-center mx-auto mb-4">
          <Mic className="w-7 h-7 text-accent-light" />
        </div>

        <h3 className="text-white font-bold text-lg mb-2">Invitation sur scène</h3>
        <p className="text-white/50 text-sm leading-relaxed mb-6">
          L'hôte t'invite à prendre la parole sur scène. Tu pourras activer ta caméra et ton micro.
        </p>

        <div className="flex gap-3">
          <button onClick={declineInvite}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white/60 transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
          >
            <X className="w-4 h-4 inline mr-1" /> Refuser
          </button>
          <button onClick={acceptInvite}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-colors"
            style={{ background: '#2563eb', boxShadow: '0 4px 16px rgba(37,99,235,0.4)' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
            onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
          >
            <Mic className="w-4 h-4 inline mr-1" /> Monter sur scène
          </button>
        </div>
      </div>
    </div>
  );
}