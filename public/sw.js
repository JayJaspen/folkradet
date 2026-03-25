const CACHE_NAME = "folkradet-v1";
const PRECACHE = [
  "/",
  "/login",
  "/register",
  "/favicon.png",
  "/logo.png",
  "/logo-header.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Installera: förcacha viktiga sidor och tillgångar
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Aktivera: rensa gamla cacher
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first, fallback på cache
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Skippa Supabase- och 46elks-anrop – dessa ska aldrig cachas
  const url = new URL(event.request.url);
  if (
    url.hostname.includes("supabase") ||
    url.hostname.includes("46elks") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cacha lyckade responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
