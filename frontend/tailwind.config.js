/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#1e3a5f',
          950: '#0f2137',
        },
        civic: {
          blue: '#2563eb',
          sky: '#0ea5e9',
          green: '#16a34a',
          amber: '#d97706',
          red: '#dc2626',
        },
        // Warm dark "control room" theme used by the results map
        taupe: {
          200: '#d6ccc4',
          300: '#b8aba1',
          400: '#968a80',
          700: '#463e39',
          800: '#332d29',
          900: '#26211e',
          950: '#1a1614',
        },
        glow: {
          normal: '#4ade80',
          degraded: '#f5a524',
          critical: '#f43f5e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    }
  },
  plugins: []
}
