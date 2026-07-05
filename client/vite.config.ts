import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.ico', 'icons/*.png', 'icons/*.svg', 'fonts/*.woff2'],
      manifest: {
        name: '12% Café de Especialidad',
        short_name: '12%C',
        description: 'Café de especialidad mexicano. Origen único, trazabilidad total.',
        theme_color: '#0d0806',
        background_color: '#0d0806',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/tienda',
        categories: ['shopping', 'food & drink'],
        icons: [
          { src: 'icons/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-256x256.png', sizes: '256x256', type: 'image/png' },
          { src: 'icons/pwa-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-1024x1024.png', sizes: '1024x1024', type: 'image/png' },
          {
            src: 'icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any',
          },
        ],
        shortcuts: [
          {
            name: 'Tienda',
            short_name: 'Tienda',
            description: 'Abre la tienda',
            url: '/tienda',
            icons: [{ src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Suscripciones',
            short_name: 'Suscripción',
            description: 'Ver planes de suscripción',
            url: '/suscripciones',
            icons: [{ src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
    }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-router')) return 'vendor-router';
          if (id.includes('node_modules/framer-motion')) return 'vendor-animation';
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
          if (id.includes('node_modules/@stripe')) return 'vendor-stripe';
          if (id.includes('node_modules/zustand')) return 'vendor-state';
          if (id.includes('node_modules')) return 'vendor-core';
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
