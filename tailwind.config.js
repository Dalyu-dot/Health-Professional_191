/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#172026',
        field: '#f8fafc',
        phil: {
          50: '#ecfdf7',
          100: '#d1faeb',
          600: '#0f766e',
          700: '#0f5f59',
          900: '#123331'
        }
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: []
};
