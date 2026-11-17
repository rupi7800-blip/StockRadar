import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0d10', panel: '#13161b', panel2: '#1a1e25', line: '#262b33',
        ink: '#e7eaee', mute: '#8a93a0',
        up: '#22c55e', down: '#ef4444', warn: '#eab308', info: '#3b82f6', accent: '#14b8a6',
      },
      fontFamily: { sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Inter', 'sans-serif'] },
      keyframes: { marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } } },
    },
  },
  plugins: [],
} satisfies Config;
