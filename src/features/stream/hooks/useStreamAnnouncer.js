// src/features/stream/hooks/useStreamAnnouncer.js
// ─────────────────────────────────────────────────────────────
// Annonceur visuel style Google Meet — toasts texte discrets
// + musique d'attente douce quand on est seul dans le live
// Zéro synthèse vocale, zéro interruption audio
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react';
import { useStream } from '../context/StreamContext.jsx';
import { ROLE } from '../../../config.js';

// ── Toast visuel → capté par <StreamAnnouncer> ────────────────
function emitToast(text, type = 'info') {
  window.dispatchEvent(new CustomEvent('stream:announce', {
    detail: { text, type, id: Date.now() + Math.random() },
  }));
}

// ── Musique d'attente (fichier public/sons/son.wav) ───────────
function startWaitingMusic() {
  let audio, stopped = false;

  try {
    audio = new Audio('/sons/son.wav');
    audio.loop   = true;
    audio.volume = 0;

    audio.play().catch(err =>
      console.warn('[Announcer] Lecture audio non disponible:', err.message)
    );

    // Fade in doux : 0 → 0.12 en 1.5s (même comportement qu'avant)
    const target   = 0.12;
    const duration = 1500; // ms
    const steps    = 30;
    const interval = duration / steps;
    let   step     = 0;

    const fadeIn = setInterval(() => {
      step++;
      audio.volume = Math.min(target, (step / steps) * target);
      if (step >= steps) clearInterval(fadeIn);
    }, interval);

  } catch (err) {
    console.warn('[Announcer] Web Audio non disponible:', err.message);
  }

  // Stop avec fade out — même signature qu'avant
  return () => {
    stopped = true;
    if (!audio) return;

    const steps    = 20;
    const interval = 800 / steps; // 0.8s comme le fade out original
    const startVol = audio.volume;
    let   step     = 0;

    const fadeOut = setInterval(() => {
      step++;
      audio.volume = Math.max(0, startVol * (1 - step / steps));
      if (step >= steps) {
        clearInterval(fadeOut);
        audio.pause();
        audio.src = '';
      }
    }, interval);
  };
}

// ── Hook principal ─────────────────────────────────────────────
export function useStreamAnnouncer() {
  const { participants, myRole, isScreenSharing, handRaisedIds } = useStream();

  const stopMusicRef  = useRef(null);
  const prevCountRef  = useRef(0);
  const prevNamesRef  = useRef(new Set());
  const prevScreenRef = useRef(false);
  const prevHandsRef  = useRef(new Set());
  const announcedRef  = useRef(new Set());

  const isActive = myRole === ROLE.HOST || myRole === ROLE.SPEAKER;

  // ── Musique d'attente + toast quand seul ─────────────────────
  useEffect(() => {
    const count = participants.size;
    const names = new Set(Array.from(participants.values()).map(p => p.identity));
    const prevNames = prevNamesRef.current;

    if (count <= 1 && isActive) {
      // Seul dans le live → musique + toast
      if (!stopMusicRef.current) {
        stopMusicRef.current = startWaitingMusic();
        setTimeout(() => emitToast('Vous êtes seul pour l\'instant', 'info'), 1200);
      }
    } else {
      // Quelqu'un a rejoint → arrêter la musique
      if (stopMusicRef.current) {
        stopMusicRef.current();
        stopMusicRef.current = null;
      }
      // Toast d'arrivée
      if (count > prevCountRef.current && prevCountRef.current > 0) {
        names.forEach(id => {
          if (!prevNames.has(id)) {
            const p    = participants.get(id);
            const name = p?.name || p?.identity || 'Quelqu\'un';
            emitToast(`${name} a rejoint`, 'join');
          }
        });
      } else if (count < prevCountRef.current) {
        emitToast('Un participant a quitté', 'leave');
      }
    }

    prevCountRef.current = count;
    prevNamesRef.current = names;
  }, [participants, isActive]);

  // ── Partage d'écran ───────────────────────────────────────────
  useEffect(() => {
    if (isScreenSharing && !prevScreenRef.current) {
      emitToast('Vous partagez votre écran', 'screen');
    } else if (!isScreenSharing && prevScreenRef.current) {
      emitToast('Partage d\'écran arrêté', 'info');
    }
    prevScreenRef.current = isScreenSharing;
  }, [isScreenSharing]);

  // ── Mains levées (hôte uniquement) ───────────────────────────
  useEffect(() => {
    if (myRole !== ROLE.HOST) return;
    handRaisedIds.forEach(id => {
      if (!prevHandsRef.current.has(id) && !announcedRef.current.has(`hand_${id}`)) {
        announcedRef.current.add(`hand_${id}`);
        const p    = participants.get(id);
        const name = p?.name || p?.identity || 'Un participant';
        emitToast(`${name} a levé la main ✋`, 'hand');
      }
    });
    prevHandsRef.current.forEach(id => {
      if (!handRaisedIds.has(id)) announcedRef.current.delete(`hand_${id}`);
    });
    prevHandsRef.current = new Set(handRaisedIds);
  }, [handRaisedIds, participants, myRole]);

  // ── Sondages ──────────────────────────────────────────────────
  useEffect(() => {
    const onPoll = (e) => {
      if (e.detail?.type === 'poll_created') emitToast('Nouveau sondage disponible 📊', 'poll');
    };
    window.addEventListener('stream:poll_event', onPoll);
    return () => window.removeEventListener('stream:poll_event', onPoll);
  }, []);

  // ── Fichiers partagés ─────────────────────────────────────────
  useEffect(() => {
    const onFile = (e) => {
      const name = e.detail?.name || 'un fichier';
      emitToast(`Fichier partagé : ${name} 📎`, 'file');
    };
    window.addEventListener('stream:file_received', onFile);
    return () => window.removeEventListener('stream:file_received', onFile);
  }, []);

  // ── Cleanup au démontage ──────────────────────────────────────
  useEffect(() => {
    return () => {
      if (stopMusicRef.current) {
        stopMusicRef.current();
        stopMusicRef.current = null;
      }
    };
  }, []);
}