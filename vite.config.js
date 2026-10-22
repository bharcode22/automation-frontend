import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://192.168.199.40:5051',
        changeOrigin: true
      },
      '/health': {
        target: 'http://192.168.199.40:5051',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://192.168.199.40:5051',
        ws: true
      }
    }
  }
})
