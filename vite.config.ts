import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            // Make the SW take control and pick up new deploys without a manual
            // reload — avoids the "stale bundle" class of bugs.
            workbox: {
                cleanupOutdatedCaches: true,
                clientsClaim: true,
                skipWaiting: true,
                // SPA: serve index.html for client-side routes.
                navigateFallback: '/index.html',
                // Never let the SW intercept Supabase / cross-origin API calls.
                navigateFallbackDenylist: [/^\/api/, /supabase\.co/],
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
            },
            includeAssets: ['icon.png', 'icon_32.png', 'icon_192.png', 'icon_512.png'],
            manifest: {
                name: 'Congruence',
                short_name: 'Congruence',
                description: 'Tus hábitos, tu dinero, tus ideas y tu identidad — todo alineado.',
                lang: 'es',
                theme_color: '#050505',
                background_color: '#050505',
                display: 'standalone',
                orientation: 'portrait',
                scope: '/',
                start_url: '/',
                icons: [
                    { src: '/icon_192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/icon_512.png', sizes: '512x512', type: 'image/png' },
                    { src: '/icon_512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
            },
            devOptions: {
                enabled: true,
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
})
