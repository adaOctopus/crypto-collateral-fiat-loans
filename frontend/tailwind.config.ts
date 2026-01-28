import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#00A3FF', // Light blue accent for action buttons
          600: '#21C9EE', // Alternative light blue
          700: '#0284c7',
          800: '#075985',
          900: '#0c4a6e',
        },
        dark: {
          bg: '#12172C', // Main dark blue background
          card: '#1E253A', // Lighter dark blue for cards
          hover: '#2A3147', // Hover state for cards
        },
      },
    },
  },
  plugins: [],
};
export default config;
