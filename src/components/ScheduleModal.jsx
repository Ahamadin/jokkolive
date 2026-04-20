// src/components/ScheduleModal.jsx
// ─────────────────────────────────────────────────────────────
// Modal planification réunion style Google Meet
// Champs : titre, date, heure, fuseau, description, participants (emails)
// Envoi email via /api/schedule (backend nodemailer)
// ─────────────────────────────────────────────────────────────
import { useState, useCallback, useRef } from 'react';
import { X, Calendar, Clock, Globe, Users, FileText, Send, Check, Plus, Trash2 } from 'lucide-react';

// Fuseaux horaires Afrique + monde
const TIMEZONES = [
  { value: 'Africa/Dakar',         label: '🇸🇳 Dakar (GMT+0)' },
  { value: 'Africa/Abidjan',       label: '🇨🇮 Abidjan (GMT+0)' },
  { value: 'Africa/Lagos',         label: '🇳🇬 Lagos (GMT+1)' },
  { value: 'Africa/Douala',        label: '🇨🇲 Douala (GMT+1)' },
  { value: 'Africa/Nairobi',       label: '🇰🇪 Nairobi (GMT+3)' },
  { value: 'Africa/Casablanca',    label: '🇲🇦 Casablanca (GMT+0/+1)' },
  { value: 'Africa/Tunis',         label: '🇹🇳 Tunis (GMT+1)' },
  { value: 'Africa/Cairo',         label: '🇪🇬 Le Caire (GMT+2)' },
  { value: 'Europe/Paris',         label: '🇫🇷 Paris (GMT+1/+2)' },
  { value: 'Europe/London',        label: '🇬🇧 Londres (GMT+0/+1)' },
  { value: 'America/New_York',     label: '🇺🇸 New York (GMT-5/-4)' },
  { value: 'America/Los_Angeles',  label: '🇺🇸 Los Angeles (GMT-8/-7)' },
  { value: 'Asia/Dubai',           label: '🇦🇪 Dubaï (GMT+4)' },
  { value: 'Asia/Tokyo',           label: '🇯🇵 Tokyo (GMT+9)' },
];

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}
function getDefaultTime() {
  const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0);
  return `${String(d.getHours()).padStart(2,'0')}:00`;
}

export default function ScheduleModal({ onClose }) {
  const [title,       setTitle]       = useState('');
  const [date,        setDate]        = useState(getTodayStr());
  const [time,        setTime]        = useState(getDefaultTime());
  const [duration,    setDuration]    = useState('60');
  const [timezone,    setTimezone]    = useState('Africa/Dakar');
  const [description, setDescription] = useState('');
  const [emails,      setEmails]      = useState(['']);
  const [loading,     setLoading]     = useState(false);
  const [sent,        setSent]        = useState(false);
  const [error,       setError]       = useState('');

  const addEmail = () => setEmails(prev => [...prev, '']);
  const updateEmail = (i, v) => setEmails(prev => { const n=[...prev]; n[i]=v; return n; });
  const removeEmail = (i) => setEmails(prev => prev.filter((_,j)=>j!==i));

  const validEmails = emails.filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()));

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return setError('Le titre est requis');
    if (!date || !time) return setError('La date et l\'heure sont requises');
    if (validEmails.length === 0) return setError('Ajoutez au moins un email');
    setError(''); setLoading(true);

    try {
      // Générer un code de réunion unique
      const roomCode = `${Math.random().toString(36).slice(2,6)}-${Math.random().toString(36).slice(2,7)}-${Math.random().toString(36).slice(2,5)}`.toLowerCase();
      const joinUrl  = `${window.location.origin}/prejoin/${roomCode}?role=participant`;

      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, date, time, duration, timezone, description,
          emails: validEmails, roomCode, joinUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur lors de l\'envoi');
      }

      setSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [title, date, time, duration, timezone, description, validEmails]);

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '9px 12px',
    color: '#fff', fontSize: 13, outline: 'none',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      overflowY: 'auto',
    }}>
      <div style={{
        background: '#0d1a3a', borderRadius: 20,
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '24px 22px',
        maxWidth: 500, width: '100%',
        boxShadow: '0 28px 72px rgba(0,0,0,0.7)',
        animation: 'scheduleIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        position: 'relative', margin: '16px auto',
      }}>
        {/* Fermer */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14,
          width: 28, height: 28, borderRadius: 8, border: 'none',
          background: 'rgba(255,255,255,0.07)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={14} color="rgba(255,255,255,0.5)" />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Calendar size={17} color="#60a5fa" />
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 14, margin: 0 }}>
              Planifier une réunion
            </p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0 }}>
              Une invitation sera envoyée par email
            </p>
          </div>
        </div>

        {sent ? (
          /* ── Succès ── */
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
              background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Check size={26} color="#4ade80" />
            </div>
            <p style={{ color: '#4ade80', fontWeight: 800, fontSize: 16, margin: '0 0 8px' }}>
              Invitations envoyées !
            </p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: '0 0 20px', lineHeight: 1.5 }}>
              {validEmails.length} participant{validEmails.length > 1 ? 's' : ''} a reçu une invitation par email avec le lien et le code de réunion.
            </p>
            <button onClick={onClose} style={{
              padding: '11px 24px', borderRadius: 12, border: 'none',
              background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>
              Fermer
            </button>
          </div>
        ) : (
          /* ── Formulaire ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Titre */}
            <div>
              <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 6 }}>
                Titre de la réunion *
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex : Réunion équipe commerciale"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.5)'}
                onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            {/* Date + Heure */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <Calendar size={11} /> Date *
                </label>
                <input
                  type="date" value={date} min={getTodayStr()}
                  onChange={e => setDate(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.5)'}
                  onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <Clock size={11} /> Heure *
                </label>
                <input
                  type="time" value={time}
                  onChange={e => setTime(e.target.value)}
                  style={{ ...inputStyle, colorScheme: 'dark' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.5)'}
                  onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>
            </div>

            {/* Durée + Fuseau */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 6 }}>
                  Durée
                </label>
                <select
                  value={duration} onChange={e => setDuration(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {[15,30,45,60,90,120,180].map(d => (
                    <option key={d} value={d} style={{ background: '#0d1a3a' }}>
                      {d < 60 ? `${d} min` : `${d/60}h${d%60?` ${d%60}min`:''}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                  <Globe size={11} /> Fuseau horaire
                </label>
                <select
                  value={timezone} onChange={e => setTimezone(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer', fontSize: 11 }}
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value} style={{ background: '#0d1a3a' }}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <FileText size={11} /> Description (optionnel)
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ordre du jour, informations complémentaires…"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 70, lineHeight: 1.5 }}
                onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.5)'}
                onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            {/* Participants (emails) */}
            <div>
              <label style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                <Users size={11} /> Participants *
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {emails.map((email, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="email" value={email}
                      onChange={e => updateEmail(i, e.target.value)}
                      placeholder={`email@exemple.com`}
                      style={{ ...inputStyle, flex: 1 }}
                      onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.5)'}
                      onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                    {emails.length > 1 && (
                      <button onClick={() => removeEmail(i)} style={{
                        width: 36, height: 36, borderRadius: 9, border: 'none',
                        background: 'rgba(239,68,68,0.12)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Trash2 size={13} color="#f87171" />
                      </button>
                    )}
                  </div>
                ))}
                {emails.length < 20 && (
                  <button onClick={addEmail} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px',
                    borderRadius: 9, border: '1px dashed rgba(255,255,255,0.15)',
                    background: 'transparent', color: 'rgba(255,255,255,0.4)',
                    fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    <Plus size={13} /> Ajouter un participant
                  </button>
                )}
                {validEmails.length > 0 && (
                  <p style={{ color: '#4ade80', fontSize: 10, margin: 0 }}>
                    ✓ {validEmails.length} email{validEmails.length > 1 ? 's' : ''} valide{validEmails.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <p style={{ color: '#f87171', fontSize: 12, margin: 0, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </p>
            )}

            {/* Bouton envoyer */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%', padding: '13px', borderRadius: 13, border: 'none',
                background: loading ? '#1e40af' : '#2563eb',
                color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 16px rgba(37,99,235,0.35)', transition: 'background 0.15s',
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'schSpin 0.8s linear infinite' }} />
                  Envoi en cours…
                </>
              ) : (
                <><Send size={14} /> Envoyer les invitations</>
              )}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scheduleIn { from{opacity:0;transform:scale(0.93) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes schSpin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}