/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dde6ff',
          500: '#4f6ef7',
          600: '#3d57e8',
          700: '#2f44cc',
          900: '#1a2a6e',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
