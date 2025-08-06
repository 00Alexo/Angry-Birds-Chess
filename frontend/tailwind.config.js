/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'angry-red': '#C41E3A',
        'angry-yellow': '#FFD700',
        'angry-blue': '#0066CC',
        'angry-green': '#228B22',
        'pig-green': '#90EE90',
        'wood-brown': '#8B4513',
      },
      fontFamily: {
        'game': ['Comic Sans MS', 'cursive'],
      },
    },
  },
  plugins: [],
}
