/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'ojuju': ['Ojuju', 'sans-serif'],
      },
      colors: {
        // Custom color palette for solfege
        'solfege': {
          'do-major': '#1e3a8a',
          'do-major-accent': '#f97316',
          'do-major-highlight': '#fbbf24',
          're-major': '#0ea5e9',
          're-major-accent': '#06b6d4',
          're-major-highlight': '#e5e7eb',
          'mi-major': '#fbbf24',
          'mi-major-accent': '#f97316',
          'mi-major-highlight': '#f59e0b',
          'fa-major': '#16a34a',
          'fa-major-accent': '#dc2626',
          'fa-major-highlight': '#ea580c',
          'sol-major': '#dc2626',
          'sol-major-accent': '#fbbf24',
          'sol-major-highlight': '#1e40af',
          'la-major': '#ec4899',
          'la-major-accent': '#f43f5e',
          'la-major-highlight': '#7c3aed',
          'ti-major': '#fbbf24',
          'ti-major-accent': '#8b5cf6',
          'ti-major-highlight': '#a855f7',
          // Minor scale colors
          'do-minor': '#475569',
          'do-minor-accent': '#64748b',
          'do-minor-highlight': '#fbbf24',
          're-minor': '#166534',
          're-minor-accent': '#64748b',
          're-minor-highlight': '#0891b2',
          'me-minor': '#be185d',
          'me-minor-accent': '#f59e0b',
          'me-minor-highlight': '#6b7280',
          'fa-minor': '#166534',
          'fa-minor-accent': '#ea580c',
          'fa-minor-highlight': '#f97316',
          'sol-minor': '#581c87',
          'sol-minor-accent': '#fbbf24',
          'sol-minor-highlight': '#1e40af',
          'le-minor': '#1e1b4b',
          'le-minor-accent': '#7c2d12',
          'le-minor-highlight': '#78716c',
          'te-minor': '#7c3aed',
          'te-minor-accent': '#475569',
          'te-minor-highlight': '#f43f5e',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
