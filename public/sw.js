const CACHE_NAME = "joc-passport-v2";
// Deliberately excludes "/" — that route renders per-session auth state
// server-side, and a cached copy would freeze the logged-out (or a stale
// logged-in) view for every future visit.
const PRECACHE_URLS = ["/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Navigations and API calls always hit the network — they carry session
  // state (cookies, auth) that a cached response would silently invalidate.
  if (request.mode === "navigate" || new URL(request.url).pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached)
    )
  );
});
