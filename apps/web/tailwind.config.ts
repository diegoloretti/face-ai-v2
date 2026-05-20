import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx,html}', './index.html'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        surface: '#14141f',
        border: '#1e1e2e',
        text: '#e8e8f0',
        muted: '#555570',
        accent: {
          cyan: '#00ffcc',
          pink: '#ff3cac',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
