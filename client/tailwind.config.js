/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        coffee: {
          950: '#0d0806',
          900: '#1a0f0a',
          800: '#2c1810',
          700: '#3d2015',
          600: '#5c2e1a',
          500: '#8b4513',
          400: '#a05a2c',
          300: '#c4844a',
          200: '#d4a574',
          100: '#e8d5b7',
          50:  '#f5f0e8',
        },
        gold: {
          600: '#a07840',
          500: '#c9a96e',
          400: '#d4b97a',
          300: '#e0cc98',
          200: '#edddb8',
        },
        cream: '#f5f0e8',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float':    'float 4s ease-in-out infinite',
        'shimmer':  'shimmer 2s linear infinite',
        'fade-up':  'fadeUp 0.6s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
