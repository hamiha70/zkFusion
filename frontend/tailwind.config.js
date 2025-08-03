/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // zkFusion brand colors (extracted from logo analysis)
        'zk-primary': '#6366f1',     // Indigo - ZK/crypto feel
        'zk-secondary': '#10b981',   // Emerald - success/money
        'zk-accent': '#f59e0b',      // Amber - attention/gavel
        'zk-dark': '#1f2937',        // Gray-800 - backgrounds
        'zk-light': '#f9fafb',       // Gray-50 - cards
        'zk-purple': '#8b5cf6',      // Purple - ZK theme
        'zk-gold': '#fbbf24',        // Gold - premium feel
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}