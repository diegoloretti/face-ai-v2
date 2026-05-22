import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@vladmandic/human')) return 'vendor-human'
          if (id.includes('@tensorflow') || id.includes('tfjs')) return 'vendor-tfjs'
          if (id.includes('node_modules')) return 'vendor'
          return undefined
        },
      },
    },
  },
})
