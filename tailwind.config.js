/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic surface tokens (driven by CSS vars -> light/dark)
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        sunken: 'rgb(var(--sunken) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        faint: 'rgb(var(--faint) / <alpha-value>)',
        // Brand — iris/violet
        brand: {
          50: '#eef1ff',
          100: '#e0e5ff',
          200: '#c6cfff',
          300: '#a3aeff',
          400: '#8286fb',
          500: '#6c62f2',
          600: '#5b44e6',
          700: '#4e36ca',
          800: '#4030a3',
          900: '#372e81',
          950: '#221b4b',
        },
      },
      fontFamily: {
        sans: ['Inter var', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,20,45,0.06), 0 1px 1px rgba(16,20,45,0.04)',
        pop: '0 10px 38px -12px rgba(16,20,45,0.35), 0 0 0 1px rgba(16,20,45,0.05)',
        lift: '0 20px 44px -20px rgba(16,20,45,0.45)',
        glow: '0 0 0 1px rgb(108 98 242 / 0.35), 0 8px 26px -10px rgb(108 98 242 / 0.5)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6c62f2 0%, #8b5cf6 55%, #d946ef 100%)',
        'mesh': 'radial-gradient(60% 55% at 12% 8%, rgb(108 98 242 / 0.18) 0%, transparent 60%), radial-gradient(45% 45% at 92% 12%, rgb(217 70 239 / 0.14) 0%, transparent 60%), radial-gradient(50% 50% at 60% 100%, rgb(56 189 248 / 0.12) 0%, transparent 60%)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'none' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(.97)' }, '100%': { opacity: '1', transform: 'none' } },
        'slide-up': { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        pulseRing: { '0%': { boxShadow: '0 0 0 0 rgb(108 98 242 / .45)' }, '100%': { boxShadow: '0 0 0 10px rgb(108 98 242 / 0)' } },
      },
      animation: {
        'fade-in': 'fade-in .22s ease-out',
        'scale-in': 'scale-in .16s ease-out',
        'slide-up': 'slide-up .28s cubic-bezier(.22,1,.36,1)',
        'pulse-ring': 'pulseRing 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
}
