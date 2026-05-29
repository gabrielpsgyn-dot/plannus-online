// SW temporariamente em modo "sem cache" para eliminar 404 por cache antigo no Pages.
const SW_VERSION = "plannus-sw-nocache-v3-20260528";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", () => {
  // Pass-through: deixa o navegador buscar sempre da rede (sem cache do SW).
});
