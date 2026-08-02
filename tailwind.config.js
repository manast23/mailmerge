/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#111112',
        bg: '#f7f8fa',
        surface: '#ffffff',
        'surface-low': '#f2f4f6',
        'surface-high': '#e7e8ea',
        border: '#e8e9ec',
        secondary: '#5c5f60',
        outline: '#77777b',
        accentGreen: '#10b981',
        accentOrange: '#f59e0b',
        accentRed: '#ba1a1a',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '8px',
        xl: '10px',
      },
      spacing: {
        inner_gap: '8px',
        gutter: '24px',
        stack_gap: '16px',
        sidebar_expanded: '220px',
        sidebar_collapsed: '60px',
        container_padding: '32px',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        ambient: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}
