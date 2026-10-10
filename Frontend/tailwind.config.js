/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        xs: ['var(--text-table)', {lineHeight:'1.5'}],
        sm: ['var(--text-body)', {lineHeight:'1.5'}],
        base: ['var(--text-body)', {lineHeight:'1.5'}],
        lg: ['var(--text-section)', {lineHeight:'1.4'}],
        xl: ['var(--text-title)', {lineHeight:'1.4'}],
        '2xl': ['var(--text-metric)', {lineHeight:'1.3'}],
      },
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

