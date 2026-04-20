// src/features/stream/hooks/useStreamTimer.js
import { useState, useEffect } from 'react';
import { useStream } from '../context/StreamContext.jsx';

export function useStreamTimer() {
  const { streamStartTime } = useStream();
  const [display, setDisplay] = useState('0:00');

  useEffect(() => {
    const tick = () => {
      if (!streamStartTime) { setDisplay('0:00'); return; }
      const ms = Date.now() - new Date(streamStartTime).getTime();
      const s  = Math.floor(ms / 1000);
      const m  = Math.floor(s  / 60);
      const h  = Math.floor(m  / 60);
      if (h > 0) {
        setDisplay(`${h}:${String(m % 60).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`);
      } else {
        setDisplay(`${m}:${String(s % 60).padStart(2,'0')}`);
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [streamStartTime]);

  return display;
}