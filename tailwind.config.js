/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary:         '#1a2b5c',
        'primary-light': '#2a3f8f',
        'primary-dark':  '#0f1a3a',
        accent:          '#2563eb',
        'accent-light':  '#3b82f6',
        live:            '#ef4444',
        'live-dark':     '#dc2626',
        surface:         '#f0f4ff',
        dark:            '#0d1a3a',
        'dark-card':     '#111e42',
        'dark-surface':  '#182050',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        soft:  '0 4px 24px rgba(26,43,92,0.08)',
        card:  '0 2px 12px rgba(26,43,92,0.10)',
        heavy: '0 8px 40px rgba(0,0,0,0.35)',
        glow:  '0 0 24px rgba(239,68,68,0.4)',
        meet:  '0 0 0 2px rgba(37,99,235,0.4)',
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease',
        'slide-up':   'slideUp 0.3s ease',
        'pulse-live': 'pulseLive 2s ease infinite',
        'spin-slow':  'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseLive: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.4)' },
          '50%':     { boxShadow: '0 0 0 8px rgba(239,68,68,0)' },
        },
      },
    },
  },
  plugins: [],
};