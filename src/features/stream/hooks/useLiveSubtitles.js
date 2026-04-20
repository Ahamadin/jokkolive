// src/features/stream/hooks/useLiveSubtitles.js
// AudioWorkletNode + Whisper-tiny — temps réel, sans ScriptProcessorNode
import { useState, useRef, useCallback, useEffect } from 'react';

export const WHISPER_LANGS = [
  { code: 'french',     label: 'Français',  flag: '🇫🇷' },
  { code: 'english',    label: 'English',   flag: '🇺🇸' },
  { code: 'arabic',     label: 'عربي',      flag: '🇸🇦' },
  { code: 'portuguese', label: 'Português', flag: '🇧🇷' },
  { code: 'spanish',    label: 'Español',   flag: '🇪🇸' },
  { code: 'german',     label: 'Deutsch',   flag: '🇩🇪' },
  { code: 'wolof',      label: 'Wolof',     flag: '🇸🇳' },
];

const SAMPLE_RATE   = 16000;
const VAD_THRESHOLD = 0.013;  // RMS min voix détectée (abaissé pour plus sensible)
const SILENCE_MS    = 700;    // silence → envoi chunk (réduit pour réactivité)
const MIN_SPEECH_MS = 200;
const MAX_CHUNK_MS  = 5000;   // envoi forcé après 5s
const TEXT_CLEAR_MS = 2000;   // effacer texte après 2s de silence

export function useLiveSubtitles() {
  const [enabled,       setEnabled]       = useState(false);
  const [modelState,    setModelState]    = useState('idle');
  const [modelProgress, setModelProgress] = useState(0);
  const [transcript,    setTranscript]    = useState('');
  const [isListening,   setIsListening]   = useState(false);
  const [isSpeaking,    setIsSpeaking]    = useState(false);
  const [lang,          setLang]          = useState('french');

  const workerRef        = useRef(null);
  const streamRef        = useRef(null);
  const audioCtxRef      = useRef(null);
  const workletRef       = useRef(null);   // AudioWorkletNode
  const samplesRef       = useRef([]);
  const speechStartRef   = useRef(null);
  const silenceStartRef  = useRef(null);
  const clearTimerRef    = useRef(null);
  const enabledRef       = useRef(false);
  const langRef          = useRef('french');
  const processingRef    = useRef(false);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { langRef.current    = lang;    }, [lang]);

  const createWorker = useCallback(() => {
    if (workerRef.current) return;
    const worker = new Worker(
      new URL('../workers/whisper.worker.js', import.meta.url),
      { type: 'module' }
    );
    worker.onmessage = ({ data }) => {
      if (data.type === 'loading') { setModelState('loading'); setModelProgress(data.progress ?? 0); }
      if (data.type === 'ready')   { setModelState('ready'); }
      if (data.type === 'transcript') {
        processingRef.current = false;
        if (data.text) {
          setTranscript(data.text);
          clearTimeout(clearTimerRef.current);
          clearTimerRef.current = setTimeout(() => setTranscript(''), TEXT_CLEAR_MS);
        }
      }
      if (data.type === 'error') { processingRef.current = false; }
    };
    worker.onerror = () => setModelState('error');
    workerRef.current = worker;
    worker.postMessage({ type: 'load' });
  }, []);

  const getRMS = useCallback((buf) => {
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / buf.length);
  }, []);

  const sendChunk = useCallback(() => {
    if (processingRef.current) return;
    const arr = samplesRef.current;
    if (!arr.length) return;
    const ms = (arr.length / SAMPLE_RATE) * 1000;
    if (ms < MIN_SPEECH_MS) { samplesRef.current = []; return; }
    processingRef.current = true;
    const audio = new Float32Array(arr);
    samplesRef.current = [];
    workerRef.current?.postMessage(
      { type: 'transcribe', audio, language: langRef.current },
      [audio.buffer] // transfert zero-copie
    );
  }, []);

  // Traitement VAD sur chaque bloc audio reçu du worklet
  const handleAudioBlock = useCallback((samples) => {
    if (!enabledRef.current) return;
    const rms = getRMS(samples);
    const sp  = rms > VAD_THRESHOLD;
    setIsSpeaking(sp);
    const now = Date.now();

    if (sp) {
      silenceStartRef.current = null;
      if (!speechStartRef.current) speechStartRef.current = now;
      clearTimeout(clearTimerRef.current); // on reparle → annuler effacement
      samplesRef.current.push(...samples);
      if (now - speechStartRef.current >= MAX_CHUNK_MS) {
        sendChunk();
        speechStartRef.current = now;
      }
    } else {
      if (!silenceStartRef.current) silenceStartRef.current = now;
      // Accumuler encore un peu pour ne pas couper les derniers mots
      if (samplesRef.current.length > 0) samplesRef.current.push(...samples);
      const sd = now - (silenceStartRef.current || now);
      if (sd >= SILENCE_MS && speechStartRef.current !== null && samplesRef.current.length > 0) {
        speechStartRef.current = null;
        sendChunk();
      }
    }
  }, [getRMS, sendChunk]);

  const startCapture = useCallback(async () => {
    if (audioCtxRef.current) return;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE, channelCount: 1,
          echoCancellation: true, noiseSuppression: true, autoGainControl: true,
        },
      });
    } catch {
      setEnabled(false); enabledRef.current = false; return;
    }
    streamRef.current = stream;
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    audioCtxRef.current = ctx;

    try {
      // Charger le processeur AudioWorklet
      await ctx.audioWorklet.addModule(
        new URL('../workers/mic.processor.js', import.meta.url)
      );
      const source  = ctx.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(ctx, 'mic-processor');
      workletRef.current = worklet;

      // Recevoir les blocs audio du processeur
      worklet.port.onmessage = ({ data }) => {
        if (data.type === 'audio') handleAudioBlock(data.samples);
      };

      source.connect(worklet);
      // PAS connecté à destination → pas de feedback audio
      setIsListening(true);

    } catch (err) {
      console.error('[Subtitles] AudioWorklet failed:', err);
      ctx.close(); audioCtxRef.current = null;
      stream.getTracks().forEach(t => t.stop()); streamRef.current = null;
      setEnabled(false); enabledRef.current = false;
    }
  }, [handleAudioBlock]);

  const stopCapture = useCallback(() => {
    workletRef.current?.disconnect();
    workletRef.current = null;
    if (audioCtxRef.current?.state !== 'closed') audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    samplesRef.current = []; speechStartRef.current = null;
    silenceStartRef.current = null; processingRef.current = false;
    clearTimeout(clearTimerRef.current);
    setIsListening(false); setIsSpeaking(false); setTranscript('');
  }, []);

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      enabledRef.current = next;
      if (next) { createWorker(); startCapture(); }
      else      { stopCapture(); }
      return next;
    });
  }, [createWorker, startCapture, stopCapture]);

  const changeLang = useCallback((l) => {
    setLang(l); langRef.current = l;
    samplesRef.current = []; setTranscript('');
  }, []);

  useEffect(() => () => {
    stopCapture();
    workerRef.current?.terminate();
    workerRef.current = null;
  }, [stopCapture]);

  return {
    enabled, transcript, isListening, isSpeaking,
    modelState, modelProgress, lang,
    toggle, changeLang, langs: WHISPER_LANGS,
  };
}