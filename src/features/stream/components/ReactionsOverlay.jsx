// src/features/stream/components/ReactionsOverlay.jsx
import { useStream } from '../context/StreamContext.jsx';

export default function ReactionsOverlay() {
  const { reactions } = useStream();

  return (
    <div className="absolute bottom-20 right-4 pointer-events-none z-30 flex flex-col-reverse gap-1">
      {reactions.map(r => (
        <div
          key={r.id}
          className="reaction-float text-2xl select-none"
          style={{
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          {r.emoji}
        </div>
      ))}
    </div>
  );
}