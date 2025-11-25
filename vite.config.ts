import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3002,
        host: '0.0.0.0',
      },
      build: {
        chunkSizeWarningLimit: 1500, // Increase limit to 1500 kB (default is 500 kB)
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
          },
          output: {
            manualChunks: (id) => {
              // Split vendor chunks for better caching
              if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
                return 'react-vendor';
              }
              if (id.includes('node_modules/@supabase')) {
                return 'supabase-vendor';
              }
              if (id.includes('node_modules/recharts')) {
                return 'chart-vendor';
              }
              // Split Islamic data into separate chunks
              if (id.includes('data/islamic/hadith-bukhari-english.json')) {
                return 'islamic-bukhari';
              }
              if (id.includes('data/islamic/hadith-muslim-english.json')) {
                return 'islamic-muslim';
              }
              if (id.includes('data/islamic/quran-arabic.json')) {
                return 'islamic-quran';
              }
              // Split HadithMV data into separate chunks
              if (id.includes('data/islamic/hadithmv/muwattaMalik.json')) {
                return 'hadithmv-muwatta';
              }
              if (id.includes('data/islamic/hadithmv/umdathulAhkam.json')) {
                return 'hadithmv-umdatul';
              }
              if (id.includes('data/islamic/hadithmv/')) {
                return 'hadithmv-data';
              }
              if (id.includes('data/islamic/')) {
                return 'islamic-data';
              }
            }
          }
        }
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['icon.svg', 'icon-*.png'],
          manifest: {
            name: 'LifeOS - Personal Life Management System',
            short_name: 'LifeOS',
            description: 'Your personal life operating system for managing habits, finances, health, and more',
            theme_color: '#3B82F6',
            background_color: '#0F172A',
            display: 'standalone',
            orientation: 'portrait-primary',
            start_url: '/',
            icons: [
              {
                src: '/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any maskable'
              },
              {
                src: '/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
            maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50 MB (increased for HadithMV data)
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'tailwind-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                  }
                }
              },
              {
                urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'supabase-cache',
                  networkTimeoutSeconds: 10,
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 5 // 5 minutes
                  }
                }
              }
            ]
          },
          devOptions: {
            enabled: true,
            type: 'module'
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
