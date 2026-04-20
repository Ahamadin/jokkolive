// src/features/stream/workers/mic.processor.js
// AudioWorkletProcessor — remplace ScriptProcessorNode (déprécié)
class MicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf  = [];
    this._size = 2048; // ~128ms à 16kHz
  }

  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) this._buf.push(ch[i]);
    while (this._buf.length >= this._size) {
      const chunk = new Float32Array(this._buf.splice(0, this._size));
      this.port.postMessage({ type: 'audio', samples: chunk }, [chunk.buffer]);
    }
    return true;
  }
}

registerProcessor('mic-processor', MicProcessor);