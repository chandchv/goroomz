/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      // Custom breakpoints for tablet and desktop optimization
      screens: {
        'xs': '475px',
        // sm: 640px (default)
        // md: 768px (default - tablet)
        // lg: 1024px (default - desktop)
        // xl: 1280px (default)
        '2xl': '1536px',
      },
      // Touch-friendly spacing
      spacing: {
        'touch': '44px', // Minimum touch target size (44x44px)
        'touch-lg': '56px', // Larger touch target
      },
      // Minimum sizes for touch targets
      minHeight: {
        'touch': '44px',
        'touch-lg': '56px',
      },
      minWidth: {
        'touch': '44px',
        'touch-lg': '56px',
      },
    },
  },
  plugins: [],
}

