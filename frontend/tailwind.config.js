/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        petrol: {
          50: '#F0F6FA',
          100: '#DFEDF5',
          200: '#BFDAE9',
          300: '#94BFD8',
          400: '#5D9ABF',
          500: '#2E739E',
          600: '#16557C',
          700: '#0E4262',
          800: '#0B3954',
          900: '#071A2B',
          950: '#04101C',
        },
        energy: {
          50: '#FFF6EC',
          100: '#FFEAD1',
          200: '#FFD2A1',
          300: '#FFB566',
          400: '#FF9A33',
          500: '#FF7A00',
          600: '#E86E00',
          700: '#C25B00',
        },
        fuel: {
          400: '#FFC107',
          500: '#F5B500',
        },
        success: '#16A34A',
        danger: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'petroleum-gradient': 'linear-gradient(135deg, #071A2B 0%, #0B3954 100%)',
        'energy-gradient': 'linear-gradient(135deg, #FF7A00 0%, #FFC107 100%)',
      },
      boxShadow: {
        card: '0 1px 3px rgba(7, 26, 43, 0.06), 0 4px 16px rgba(7, 26, 43, 0.06)',
        'card-hover': '0 2px 6px rgba(7, 26, 43, 0.08), 0 10px 28px rgba(7, 26, 43, 0.12)',
        glow: '0 0 0 3px rgba(255, 122, 0, 0.18)',
        'glow-sm': '0 0 0 2px rgba(255, 122, 0, 0.22)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
        'slide-in-right': 'slide-in-right 0.25s ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
