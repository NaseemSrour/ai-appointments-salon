/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['system-ui', '-apple-system', 'Segoe UI', 'Tahoma', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
