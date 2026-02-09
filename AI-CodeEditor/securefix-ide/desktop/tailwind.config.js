/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './editor/**/*.{js,ts,jsx,tsx}',
    '../gui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'sf-bg-primary': '#1e1e1e',
        'sf-bg-secondary': '#252526',
        'sf-bg-tertiary': '#2d2d2d',
        'sf-bg-hover': '#2a2d2e',
        'sf-bg-active': '#37373d',
        'sf-border': '#3c3c3c',
        'sf-text-primary': '#cccccc',
        'sf-text-secondary': '#808080',
        'sf-text-muted': '#6e6e6e',
        'sf-accent': '#0078d4',
        'sf-accent-hover': '#1c85d9',
        'sf-danger': '#f14c4c',
        'sf-warning': '#cca700',
        'sf-success': '#89d185',
        'sf-info': '#3794ff',
      },
    },
  },
  plugins: [],
};
