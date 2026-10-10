import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // The API gateway only allows the origins localhost:5173 and localhost:3000 (CORS).
    // strictPort makes Vite fail instead of silently moving to 5174, which would break every API call.
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Long-lived library chunks: they change rarely, so browsers keep them cached between deploys.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'vendor-react'
          if (/node_modules\/(@reduxjs|redux|react-redux|immer|reselect|axios)\//.test(id)) return 'vendor-data'
          if (id.includes('lucide-react')) return 'vendor-icons'
          return 'vendor'
        },
      },
    },
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
})
