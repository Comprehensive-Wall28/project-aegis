const CACHE_NAME = 'aegis-cache-v3';
const STATIC_ASSETS = '/assets/';
const FONT_ASSETS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// Core app shell assets to cache on install
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/favicon.svg',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Only handle http and https protocols
    if (!url.protocol.startsWith('http')) return;

    // Bypassing API calls for general shell caching
    if (url.pathname.startsWith('/api/')) return;

    // 1. Cache-First for hashed static assets (JS/CSS)
    if (url.pathname.startsWith(STATIC_ASSETS)) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                return cached || fetch(event.request).then((response) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                });
            })
        );
        return;
    }

    // 2. Cache-First for Fonts
    if (FONT_ASSETS.some(domain => url.hostname.includes(domain)) || url.pathname.endsWith('.woff2')) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                return cached || fetch(event.request).then((response) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                });
            })
        );
        return;
    }

    // 3. Network-First for Navigation Requests (HTML) to ensure latest app version
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).then((response) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, response.clone());
                    return response;
                });
            }).catch(() => {
                return caches.match(event.request);
            })
        );
        return;
    }

    // 4. Stale-While-Revalidate for everything else (Images, manifest, etc.)
    event.respondWith(
        caches.match(event.request).then((cached) => {
            const fetched = fetch(event.request).then((response) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, response.clone());
                    return response;
                });
            }).catch(() => null);

            return cached || fetched;
        })
    );
});
