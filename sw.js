/* Service worker: funciona sin conexión tras la primera visita.
   - HTML, JS y CSS: primero red (así llegan las actualizaciones), y si no hay red, la copia guardada.
   - Imágenes, fuentes y demás: primero copia guardada y se refresca en segundo plano. */
var CACHE = 'ie-roguelike-v1';

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(['./', './index.html', './manifest.json', './favicon.svg']); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function isCode(url) { return /\.(html|js|css|json)$/.test(url.pathname) || url.pathname.endsWith('/'); }
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin === location.origin && isCode(url)) {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () { return caches.match(req).then(function (m) { return m || caches.match('./index.html'); }); }));
    return;
  }
  e.respondWith(caches.match(req).then(function (cached) {
    var net = fetch(req).then(function (res) {
      if (res && (res.status === 200 || res.type === 'opaque')) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () { return cached; });
    return cached || net;
  }));
});
