// Offline cache via a runtime (not precache-list) strategy: nothing is hardcoded here, so this
// never goes stale as cipher modules are added — whatever the app actually loads gets cached.
// Cache-first with background revalidation: a cached response (if any) is served instantly (this
// is what makes the app work offline), while a network fetch runs in the background to refresh the
// cache for next time. Bump CACHE_NAME to force clients to discard everything cached under an old
// version after a deploy.
const CACHE_NAME = 'data-encrypt-visualiser-v1';

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        )),
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            const cached = await cache.match(event.request);

            const networkFetch = fetch(event.request)
                .then((response) => {
                    if (response && response.ok) {
                        cache.put(event.request, response.clone());
                    }
                    return response;
                })
                .catch(() => null);

            if (cached) {
                // Revalidate in the background; the page already has a response, no need to wait.
                networkFetch;
                return cached;
            }

            const networkResponse = await networkFetch;
            return networkResponse || new Response('Offline and not yet cached', { status: 503 });
        }),
    );
});
