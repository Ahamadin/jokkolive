// src/features/stream/workers/whisper.worker.js
// whisper-tiny (40Mo) — 4x plus rapide que whisper-base
import { pipeline, env } from '@huggingface/transformers';

const MODEL_ID = 'Xenova/whisper-tiny';

env.allowLocalModels  = false;
env.allowRemoteModels = true;
env.backends.onnx.wasm.numThreads = 1;

let transcriber  = null;
let isLoading    = false;
let pendingQueue = [];

async function loadModel() {
  if (transcriber) { self.postMessage({ type: 'ready' }); return; }
  if (isLoading)   return;
  isLoading = true;
  self.postMessage({ type: 'loading', progress: 0 });
  try {
    transcriber = await pipeline('automatic-speech-recognition', MODEL_ID, {
      // dtype explicite → supprime les warnings "Using default dtype"
      dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
      progress_callback: (p) => {
        if (p.status === 'progress')
          self.postMessage({ type: 'loading', progress: Math.round(p.progress ?? 0) });
      },
    });
    self.postMessage({ type: 'ready' });
    for (const r of pendingQueue) await transcribe(r.audio, r.language);
    pendingQueue = [];
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message });
  } finally {
    isLoading = false;
  }
}

async function transcribe(audioData, language) {
  if (!transcriber) return;
  try {
    const result = await transcriber(audioData, {
      language:          language || 'french',
      task:              'transcribe',
      return_timestamps: false, // plus rapide sans timestamps
    });
    const text = (result?.text ?? '').trim();
    self.postMessage({ type: 'transcript', text: isHallucination(text) ? '' : text });
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message });
  }
}

const HALL = new Set([
  'merci','merci.','merci !','sous-titres réalisés par','sous-titres par',
  'sous-titres','thank you','thanks for watching','you','.',
  '...','.. ..','subtitles by','amara.org',
  'je vous remercie','bonne journée','bonsoir','bonjour',
  'music','[music]','[applause]',
]);
function isHallucination(t) {
  const s = t.toLowerCase().trim();
  if (s.length < 2) return true;
  if (HALL.has(s))  return true;
  const w = s.split(/\s+/);
  if (w.length >= 4 && new Set(w).size === 1) return true;
  return false;
}

self.addEventListener('message', async ({ data }) => {
  if (data.type === 'load')
    await loadModel();
  else if (data.type === 'transcribe') {
    if (!transcriber) pendingQueue.push({ audio: data.audio, language: data.language });
    else              await transcribe(data.audio, data.language);
  }
});