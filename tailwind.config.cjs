/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0F172A',      // Slate 900
          card: '#1E293B',    // Slate 800
          border: '#334155',  // Slate 700
          text: '#F8FAFC',    // Slate 50
          muted: '#94A3B8',   // Slate 400
        },
        brand: {
          primary: '#3B82F6', // Blue 500
          secondary: '#10B981', // Emerald 500
          accent: '#8B5CF6',   // Violet 500
          warning: '#F59E0B',  // Amber 500
          danger: '#EF4444',   // Red 500
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        premium: '0 4px 20px -2px rgba(15, 23, 42, 0.3), 0 2px 8px -1px rgba(15, 23, 42, 0.2)',
      }
    },
  },
  plugins: [],
}
