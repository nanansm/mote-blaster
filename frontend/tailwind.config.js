/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6',   // Blue 500
          dark: '#1D4ED8',      // Blue 700
          light: '#DBEAFE',     // Blue 100
        },
        background: {
          DEFAULT: '#F8FAFC',   // Slate 50
          card: '#FFFFFF',      // White
          sidebar: '#EFF6FF',   // Blue 50
        },
        text: {
          primary: '#1E293B',   // Slate 800
          secondary: '#64748B', // Slate 500
          muted: '#94A3B8',     // Slate 400
        },
        border: {
          DEFAULT: '#E2E8F0',   // Slate 200
        },
        status: {
          success: '#22C55E',   // Green 500
          error: '#EF4444',     // Red 500
          warning: '#F59E0B',   // Amber 500
          info: '#3B82F6',      // Blue 500
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
