/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'golf-pink': '#F4C2C2',
        'golf-green': '#98FF98',
        'golf-blue': '#87CEEB',
        'golf-cream': '#FFFFF0',
        'golf-brown': '#5C4033',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
