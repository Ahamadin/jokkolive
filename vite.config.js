// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],

  server: {
    https: {
      key:  fs.readFileSync('certificats/localhost-key.pem'),
      cert: fs.readFileSync('certificats/localhost.pem'),
    },
    port: 5173,
    host: true,
  },

  // ── Web Workers (Whisper Transformers.js) ──────────────────
  worker: {
    format: 'es',  // requis pour import.meta.url dans les workers
  },

  // ── Optimisation dépendances ────────────────────────────────
  optimizeDeps: {
    exclude: ['@huggingface/transformers'], // évite pré-bundling (modèles chargés à la demande)
  },

  // ── Build production ────────────────────────────────────────
  build: {
    target: 'esnext', // requis pour SharedArrayBuffer et modules ES dans workers
    rollupOptions: {
      output: {
        // Séparer Transformers.js dans son propre chunk pour lazy loading
        manualChunks: {
          transformers: ['@huggingface/transformers'],
        },
      },
    },
  },
})