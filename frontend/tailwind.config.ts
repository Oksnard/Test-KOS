/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue',
  ],
  theme: {
    extend: {
      zIndex: {
        '100': '100',
        '200': '200',
        '500': '500',
        '1000': '1000',
      },
      colors: {
        primary: '#6c5ce7',
        'primary-dark': '#5b4bd5',
        'surface-primary': '#0a0e17',
        'surface-secondary': '#111827',
        'surface-card': '#1a2236',
        'text-primary': '#e2e8f0',
        'text-secondary': '#94a3b8',
        border: '#2d3748',
        success: '#00b894',
        warning: '#fdcb6e',
        danger: '#e17055',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
