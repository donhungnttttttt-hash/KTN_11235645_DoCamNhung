/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mint: {
          DEFAULT: '#20B7A6',
          hover: '#199c8d',
          light: '#EBF8F6',
          dark: '#004D40'
        }
      }
    },
  },
  plugins: [],
};

