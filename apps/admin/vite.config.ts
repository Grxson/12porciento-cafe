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
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: '12% Café — Admin',
        short_name: '12% Admin',
        description: 'Panel de administración 12% Café de Especialidad',
        theme_color: '#0d0806',
        background_color: '#0d0806',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        categories: ['business'],
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
            name: 'Pedidos',
            short_name: 'Pedidos',
            description: 'Gestionar pedidos',
            url: '/pedidos',
            icons: [{ src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Inventario',
            short_name: 'Inventario',
            description: 'Gestionar inventario',
            url: '/inventario',
            icons: [{ src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
    }),
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['@12porciento/shared', '@12porciento/ui'],
  },
});
