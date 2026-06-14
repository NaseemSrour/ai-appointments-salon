import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Default app metadata. Override per-project via .env.local
// (VITE_APP_TITLE, VITE_APP_SHORT_NAME).
const APP_TITLE = process.env.VITE_APP_TITLE ?? 'Voice Assistant';
const APP_SHORT = process.env.VITE_APP_SHORT_NAME ?? 'Voice';

export default defineConfig({
  plugins: [
    // HTTPS for LAN testing — getUserMedia is gated to secure contexts.
    basicSsl(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: APP_TITLE,
        short_name: APP_SHORT,
        description: 'AI voice assistant',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
});
