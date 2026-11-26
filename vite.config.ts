import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/recharts|d3-/.test(id)) return 'charts'
          if (id.includes('katex')) return 'katex'
          if (id.includes('xlsx')) return 'xlsx'
          if (id.includes('jspdf')) return 'jspdf'
          if (id.includes('html2canvas')) return 'html2canvas'
          if (id.includes('dompurify')) return 'dompurify'
          if (id.includes('mammoth')) return 'mammoth'
          if (id.includes('jszip')) return 'jszip'
          if (/react|dexie|scheduler/.test(id)) return 'react-vendor'
        }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'SMART HOTS – SMA Class X',
        short_name: 'SMART HOTS',
        description: 'Platform latihan HOTS Kurikulum Merdeka kelas X',
        theme_color: '#0f766e',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true
      }
    })
  ]
})
