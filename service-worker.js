const CACHE_NAME = "papertrail-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const base = new URL("./", self.registration.scope).pathname;
    await cache.addAll([base, `${base}index.html`, `${base}favicon.svg`, `${base}manifest.webmanifest`]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    } catch {
      if (event.request.mode === "navigate") {
        const base = new URL("./", self.registration.scope).pathname;
        return caches.match(`${base}index.html`);
      }
      return new Response("Offline", { status: 503, statusText: "Offline" });
    }
  })());
});