import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages menyajikan project site di /<nama-repo>/, jadi base-nya diisi
// lewat VITE_BASE saat build di CI. Lokal tetap '/'.
const base = process.env.VITE_BASE || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Pantau Gunung Berapi',
        short_name: 'Pantau Gunung',
        description:
          'Status gunung berapi, dampak erupsi, dan panduan tindakan secara real time.',
        lang: 'id',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#080a0e',
        theme_color: '#0d1117',
        categories: ['news', 'utilities', 'weather'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Petak peta yang pernah dilihat disimpan supaya peta tetap
            // terbaca saat sinyal hilang — justru saat paling dibutuhkan.
            // Batas entri menjaga penyimpanan perangkat murah tidak penuh.
            urlPattern:
              /^https:\/\/(tile\.openstreetmap\.org|[a-c]\.tile\.opentopomap\.org)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
