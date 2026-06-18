import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
/// <reference types="vitest" />

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'icons/*.png'],
      manifest: {
        name: 'Nothing To Do App',
        short_name: 'やること消えました',
        description: 'タスクを入力して今すぐやれ。Claude AIが叱咤激励します。',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        lang: 'ja',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache', networkTimeoutSeconds: 10 },
          },
          { urlPattern: /youtube\.com/, handler: 'NetworkOnly' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
