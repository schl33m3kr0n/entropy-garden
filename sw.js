/* Entropy Garden — offline shell + runtime caches (audio after first play) */
const CACHE_VERSION = 'entropy-garden-v23';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const AUDIO_CACHE = `${CACHE_VERSION}-audio`;

const PRECACHE_URLS = [
    'index.html',
    'css/style.css',
    'js/main.js',
    'js/state.js',
    'js/shared.js',
    'js/lazy.js',
    'js/lore-pools.data.js',
    'js/sw-register.js',
    'js/modules/terminal.js',
    'js/modules/matrix.js',
    'js/modules/singularity.js',
    'js/modules/arcade.js',
    'js/ios-ui.js',
    'js/pong.js',
    'js/konami.js',
    'pages/genesis.html',
    'pages/genesis.js',
    'assets/icons/about.svg',
    'assets/icons/identity.svg',
    'assets/icons/joystick.svg',
    'assets/icons/ouroboros.svg',
    'assets/icons/signal.svg',
    'assets/icons/stats.svg',
    'assets/icons/storage.svg',
    'assets/icons/vault.svg',
    'assets/img/vault/sun-poster.webp',
    'assets/img/vault/sun-poster.jpg',
];

function isAudioRequest(pathname) {
    return pathname.includes('/assets/audio/');
}

function isAppCode(pathname) {
    return (
        pathname.includes('/js/') ||
        pathname.includes('/css/') ||
        pathname.endsWith('.html') ||
        pathname.endsWith('/')
    );
}

function isCacheableAsset(pathname) {
    return pathname.includes('/assets/') && !pathname.includes('/assets/audio/');
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then(async (cache) => {
            await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)));
        }),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))),
        ),
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (isAudioRequest(url.pathname)) {
        event.respondWith(cacheAudioAfterFetch(request));
        return;
    }

    if (isAppCode(url.pathname)) {
        event.respondWith(networkFirstAppCode(request));
        return;
    }

    if (isCacheableAsset(url.pathname) || url.pathname.includes('/pages/')) {
        event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(networkFirstShell(request));
    }
});

async function cacheAudioAfterFetch(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(AUDIO_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const fallback = await caches.match(request);
        if (fallback) return fallback;
        throw error;
    }
}

async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    const networkPromise = fetch(request)
        .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
        })
        .catch(() => null);

    if (cached) {
        eventWait(networkPromise);
        return cached;
    }

    const response = await networkPromise;
    if (response) return response;

    return new Response(null, { status: 404, statusText: 'Not Found' });
}

async function networkFirstAppCode(request) {
    const cache = await caches.open(SHELL_CACHE);
    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch (error) {
        const cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
            const fallback = await cache.match('index.html');
            if (fallback) return fallback;
        }
        throw error;
    }
}

async function networkFirstShell(request) {
    return networkFirstAppCode(request);
}

function eventWait(promise) {
    promise.catch(() => {});
}
