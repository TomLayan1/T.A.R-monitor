/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#013C1C',
          dark: '#012A14',
          light: '#E3EFE8',
        },
        // Public website palette (authenticated portals keep the existing brand green)
        pub: {
          yellow: '#F8CE2D',
          forest: '#04200A',
          lime: '#9DC356',
          ink: '#313232',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
