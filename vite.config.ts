import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // Local-dev equivalent of the production nginx reverse proxy.
      // Forwards UGent Biblio publication requests to avoid CORS.
      '/biblio-api': {
        target: 'https://biblio.ugent.be',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/biblio-api/, ''),
      },
    },
  },
  // Same proxy for `npm run preview` (serving the built bundle locally).
  preview: {
    proxy: {
      '/biblio-api': {
        target: 'https://biblio.ugent.be',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/biblio-api/, ''),
      },
    },
  },
})
