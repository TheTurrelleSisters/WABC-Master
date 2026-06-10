/*
 * service-worker.js — WABC Wide Area Ball Caller
 * Gold Coins Casino System v1.0
 * Bump CACHE_VER on every release.
 */
var CACHE_VER  = 'wabc-v1.0';
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
  var url = e.request.url;
  /* Network-first for JS, HTML, and API calls */
  if (url.indexOf('.js')          !== -1 ||
      url.indexOf('.html')        !== -1 ||
      url.indexOf('supabase.co')  !== -1 ||
      url.indexOf('jsdelivr.net') !== -1 ||
      url.indexOf('cdn.')         !== -1) {
    e.respondWith(
      fetch(e.request)
        .then(function(resp) {
          var clone = resp.clone();
          caches.open(CACHE_VER).then(function(cache) { cache.put(e.request, clone); });
          return resp;
        })
        .catch(function() { return caches.match(e.request); })
    );
    return;
  }
  /* Cache-first for icons / static assets */
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(resp) {
        var clone = resp.clone();
        caches.open(CACHE_VER).then(function(cache) { cache.put(e.request, clone); });
        return resp;
      });
    })
  );
});
