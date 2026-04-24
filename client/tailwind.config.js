/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#FFF4E6',
          100: '#FFE4BC',
          200: '#FFD08A',
          300: '#FFB957',
          400: '#F9A33A',
          500: '#F7941D',
          600: '#E07F0A',
          700: '#C06C00',
        },
        brand: {
          green: '#3D6B1A',
          cream: '#F5EFE6',
        },
      },
    },
  },
  plugins: [],
};
