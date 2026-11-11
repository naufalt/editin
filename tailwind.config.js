/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: {
          bg: '#0C0D12',
          surface: '#13151D',
          card: '#181A25',
          border: 'rgba(255, 255, 255, 0.07)',
        },
        studio: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1', // Primary Indigo Accent
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          violet: '#8B5CF6',
        }
      },
      fontFamily: {
        sans: ['Segoe UI Variable Display', 'Segoe UI', 'Inter', 'sans-serif'],
        mono: ['Cascadia Code', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
