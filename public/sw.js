// Service worker do Needle. Objetivo duplo: tornar o app instalável (o Chrome exige
// um handler de fetch) e servir o shell rapidamente. Dados de demandas continuam
// sempre vindo da rede — nada do Supabase passa por cache.

const VERSION = "needle-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const OFFLINE_URL = "/offline.html";

const PRECACHE = [OFFLINE_URL, "/brand/fav-icon.png"];

// Só estes prefixos são cacheáveis: assets versionados pelo build e a marca.
const CACHEABLE_ASSET = /^\/(_next\/static|icons|brand)\//;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Supabase (auth e demandas) é sempre rede direta, sem passar pelo cache.
  if (url.origin !== self.location.origin) return;

  // Navegação: rede primeiro para nunca servir HTML apontando para um build antigo.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match(OFFLINE_URL)) ?? Response.error()),
    );
    return;
  }

  // Assets imutáveis: cache primeiro, rede só no miss.
  if (CACHEABLE_ASSET.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
