/*
 * service-worker.js — WABC Wide Area Ball Caller
 * Gold Coins Casino System v1.0
 * Bump CACHE_VER on every release.
 */
var CACHE_VER  = 'wabc-v1.19';
var CACHE_URLS = ['./index.html', './manifest.json'];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_VER)
      .then(function(cache) {
        return cache.addAll(CACHE_URLS).catch(function(err) {
          console.warn('[SW] Pre-cache failed (non-fatal):', err);
        });
      })
      .then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(keys.map(function(key) {
          if (key !== CACHE_VER) {
            console.log('[SW] Deleting stale cache:', key);
            return caches.delete(key);
          }
        }));
      })
      .then(function() { return self.clients.claim(); })
      .then(function() {
        return self.clients.matchAll({ type: 'window' }).then(function(clients) {
          clients.forEach(function(client) {
            if ('navigate' in client) client.navigate('./index.html');
          });
        });
      })
  );
});

self.addEventListener('fetch', function(e) {
  /* Never intercept non-GET requests (POST/PATCH/PUT/DELETE) — these are
     Supabase mutations (RPC calls, inserts, updates). cache.put() only
     supports GET and throws on anything else. */
  if (e.request.method !== 'GET') return;

  var url = e.request.url;

  /* NEVER cache Supabase API responses — table reads (.select()) must
     always hit the network so the UI reflects current DB state. Caching
     these could serve stale data forever on repeat identical queries. */
  if (url.indexOf('supabase.co') !== -1) return;

  /* Network-first for JS/HTML/CDN assets */
  if (url.indexOf('.js')          !== -1 ||
      url.indexOf('.html')        !== -1 ||
      url.indexOf('jsdelivr.net') !== -1 ||
      url.indexOf('cdn.')         !== -1) {
    e.respondWith(
      fetch(e.request)
        .then(function(resp) {
          /* 206 Partial Content (audio/video range requests) cannot be
             cached — skip cache.put for those. */
          if (resp && resp.status !== 206) {
            var clone = resp.clone();
            caches.open(CACHE_VER).then(function(cache) { cache.put(e.request, clone); });
          }
          return resp;
        })
        .catch(function() { return caches.match(e.request); })
    );
    return;
  }

  /* Cache-first for icons / static assets (images, audio, video) */
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(resp) {
        if (resp && resp.status !== 206) {
          var clone = resp.clone();
          caches.open(CACHE_VER).then(function(cache) { cache.put(e.request, clone); });
        }
        return resp;
      });
    })
  );
});
