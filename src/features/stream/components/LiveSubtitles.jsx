// src/features/stream/components/LiveSubtitles.jsx
// Overlay sous-titres style YouTube — apparaît quand on parle, s'efface au silence
export default function LiveSubtitles({ transcript, isSpeaking, modelState, modelProgress }) {

  // Pendant le chargement du modèle → barre de progression
  if (modelState === 'loading') {
    return (
      <div style={{ position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:30, pointerEvents:'none' }}>
        <div style={{ background:'rgba(0,0,0,0.82)', borderRadius:10, padding:'8px 20px', textAlign:'center', minWidth:220 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'#f59e0b', animation:'ccDot 0.8s infinite' }}/>
            <span style={{ color:'rgba(255,255,255,0.6)', fontSize:11 }}>Chargement du moteur IA… {modelProgress}%</span>
          </div>
          <div style={{ height:3, background:'rgba(255,255,255,0.1)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', background:'#2563eb', width:`${modelProgress}%`, transition:'width 0.3s', borderRadius:99 }}/>
          </div>
        </div>
        <style>{`@keyframes ccDot{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
      </div>
    );
  }

  if (modelState === 'error') {
    return (
      <div style={{ position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)', zIndex:30, pointerEvents:'none' }}>
        <div style={{ background:'rgba(220,38,38,0.85)', borderRadius:10, padding:'7px 18px' }}>
          <span style={{ color:'#fff', fontSize:12 }}>⚠️ Erreur chargement modèle</span>
        </div>
      </div>
    );
  }

  // Rien à afficher
  if (!transcript) return null;

  return (
    <div style={{
      position:      'absolute',
      bottom:        28,
      left:          '50%',
      transform:     'translateX(-50%)',
      zIndex:        30,
      maxWidth:      '80%',
      pointerEvents: 'none',
      textAlign:     'center',
      animation:     'subsIn 0.15s ease',
    }}>
      <div style={{
        display:        'inline-block',
        background:     'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(6px)',
        borderRadius:   10,
        padding:        '8px 22px 9px',
        lineHeight:     1.6,
      }}>
        {/* Texte transcrit */}
        <span style={{ color:'#fff', fontSize:16, fontWeight:500, letterSpacing:'0.01em' }}>
          {transcript}
        </span>

        {/* Dot vert = écoute active */}
        {isSpeaking && (
          <span style={{
            display:'inline-block', width:7, height:7,
            borderRadius:'50%', background:'#22c55e',
            marginLeft:10, verticalAlign:'middle',
            animation:'subsDot 0.7s infinite',
          }}/>
        )}
      </div>

      <style>{`
        @keyframes subsIn  { from{opacity:0;transform:translateX(-50%) translateY(4px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes subsDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.5)} }
      `}</style>
    </div>
  );
}