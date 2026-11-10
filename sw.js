/* Service worker di Diario GET: la app si apre anche senza rete.
   Non tocca i dati del diario (stanno nel localStorage del telefono).
   Si cambia VERSIONE a ogni modifica dei file, così i telefoni scaricano la copia nuova. */
var VERSIONE = 'diario-get-v2';
var NUCLEO = ['./', 'index.html', 'manifest.webmanifest', 'icona-180.png', 'icona-192.png', 'icona-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSIONE).then(function (c) { return c.addAll(NUCLEO); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (nomi) {
    return Promise.all(nomi.filter(function (n) { return n !== VERSIONE; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  /* Prima la copia in cache, poi si aggiorna in silenzio per la prossima apertura. */
  e.respondWith(caches.open(VERSIONE).then(function (c) {
    return c.match(r, { ignoreSearch: true }).then(function (inCache) {
      var rete = fetch(r).then(function (resp) {
        if (resp && resp.ok) c.put(r, resp.clone());
        return resp;
      }).catch(function () { return inCache; });
      return inCache || rete;
    });
  }));
});
