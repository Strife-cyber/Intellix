/**
 * Intellix Service Worker
 *
 * Provides offline caching for static assets and API responses.
 * Cache-first strategy for static assets, network-first for API calls.
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `intellix-static-${CACHE_VERSION}`;
const API_CACHE = `intellix-api-${CACHE_VERSION}`;
const ASSET_CACHE = `intellix-assets-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    '/',
    '/assets/index.css',
    '/assets/index.js',
];

// Install event - pre-cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Pre-caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting()),
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [STATIC_CACHE, API_CACHE, ASSET_CACHE];
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) =>
                Promise.all(
                    cacheNames.map((cacheName) => {
                        if (!cacheWhitelist.includes(cacheName)) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    }),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

// Fetch event - cache-first for static, network-first for API
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests and browser extension requests
    if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
        return;
    }

    // API requests - network first, fallback to cache
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/study-planner/')) {
        event.respondWith(networkFirstWithCache(request, API_CACHE));
        return;
    }

    // Static assets (JS, CSS, images, fonts) - cache first
    if (
        url.pathname.startsWith('/assets/') ||
        url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ico)$/)
    ) {
        event.respondWith(cacheFirstWithRefresh(request, ASSET_CACHE));
        return;
    }

    // Page navigations - network first
    if (request.mode === 'navigate') {
        event.respondWith(networkFirstWithCache(request, STATIC_CACHE));
    }
});

/**
 * Cache-first strategy: serve from cache if available, otherwise fetch and cache.
 */
async function cacheFirstWithRefresh(request, cacheName) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        // Refresh cache in background
        fetch(request)
            .then((response) => {
                if (response.ok) {
                    const cache = caches.open(cacheName);
                    cache.then((c) => c.put(request, response.clone()));
                }
            })
            .catch(() => {});
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        return new Response('Offline', { status: 503 });
    }
}

/**
 * Network-first strategy: try network, fall back to cache on failure.
 */
async function networkFirstWithCache(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return new Response(
            JSON.stringify({ error: 'You are offline. This content is not available.' }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
            },
        );
    }
}
