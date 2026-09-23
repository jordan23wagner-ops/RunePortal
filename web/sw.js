/* ================================================================
   RIFTFALL service worker

   The whole game is one HTML file with no external requests, so offline
   play is a single cached document. That makes the strategy simple and
   the failure modes few.

   Strategy: cache-first for the shell, with a background refresh. You get
   an instant launch off the cache every time, and a newer build is picked
   up on the NEXT launch rather than being swapped in underneath a run in
   progress - reloading a player mid-fight to deliver a patch is worse
   than being one launch behind.

   Bump CACHE_V on release. Old caches are dropped on activate.
   ================================================================ */
const CACHE_V = 'riftfall-v3';
const SHELL = [
  '/3d.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/apple-touch-icon.png',
  '/favicon-64.png',
];

self.addEventListener('install', e => {
  /* addAll rejects the whole install if any one entry 404s, which would
     leave the app with no cache at all. Each is added on its own so a
     missing icon costs an icon, not offline play. */
  e.waitUntil((async () => {
    const c = await caches.open(CACHE_V);
    await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_V).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* THE background refresh has to be declared out here, and held open with
     waitUntil. It used to live inside respondWith's promise: the moment that
     resolved with the cached copy the browser was free to terminate the
     worker, and it did - usually before the fetch had written anything back.
     So the cache never updated and every single launch served the same stale
     build, no matter how many times the app was closed and reopened. */
  const fresh = fetch(req).then(res => {
    if (res && res.ok && res.type === 'basic') {
      const copy = res.clone();
      return caches.open(CACHE_V).then(c => c.put(req, copy)).then(() => res);
    }
    return res;
  }).catch(() => null);
  e.waitUntil(fresh);

  e.respondWith((async () => {
    /* ignoreSearch: the game is reached as /3d.html?live from the
       installed app and /3d.html?test from a browser tab. Matching on
       the full URL would miss the cached document for both - i.e. for
       every URL that is actually used. */
    const cached = await caches.match(req, {ignoreSearch:true});
    if (cached) return cached;

    const res = await fresh;
    if (res) return res;

    /* offline, uncached, and a navigation: hand back the game rather than
       the browser's dinosaur - any in-app link should still land somewhere */
    if (req.mode === 'navigate') {
      const shell = await caches.match('/3d.html', {ignoreSearch:true});
      if (shell) return shell;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  })());
});

/* lets the page ask for an immediate takeover, or for the whole cache to be
   dropped - the escape hatch behind the Check for Update button, since an
   installed app has no address bar and therefore no hard refresh */
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') return self.skipWaiting();
  if (e.data === 'purge') {
    e.waitUntil((async () => {
      for (const k of await caches.keys()) await caches.delete(k);
      for (const c of await self.clients.matchAll()) c.postMessage('purged');
    })());
  }
});
