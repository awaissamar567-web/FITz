/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", '[data-theme="dark"]', 'media'],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontSize: {
        '3xs': ['11px', { lineHeight: '14px', letterSpacing: '0.01em' }],
        '2xs': ['12px', { lineHeight: '16px', letterSpacing: '0.005em' }],
        'xs': ['14px', { lineHeight: '20px' }],
        'sm': ['15px', { lineHeight: '22px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg': ['18px', { lineHeight: '26px' }],
        'xl': ['22px', { lineHeight: '30px' }],
        '2xl': ['28px', { lineHeight: '36px' }],
        '3xl': ['36px', { lineHeight: '44px' }],
      },
      fontFamily: {
        display: ['"Acid Grotesk"', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        'inter-display': ['"Inter Display"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      },
      colors: {
        darkBg: "#111111",
        darkCard: "#0c0c0c",
        darkInput: "#0c0c0c",
        darkNavSelected: "#2a2a2a",
        fitzBtn: {
          DEFAULT: "#1754d8",
          hover: "#154ac0",
        },
        fitzBorder: "#909090",
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#1754d8",
          600: "#1754d8",
          700: "#154ac0",
        },
      },
    },
  },
  plugins: [],
};
