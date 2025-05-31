/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        keystone: {
          red: '#FF0000',
          black: '#000000',
          gray: {
            dark: '#1A1A1A',
            light: '#2A2A2A'
          }
        },
      },
    },
  },
  plugins: [],
};