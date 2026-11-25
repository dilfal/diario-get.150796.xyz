/* Service worker di Diario GET: la app si apre anche senza rete.
   Non tocca i dati del diario (stanno nel localStorage del telefono).
   Si cambia VERSIONE a ogni modifica dei file, così i telefoni scaricano la copia nuova. */
var VERSIONE = 'diario-get-v7';
var NUCLEO = ['./', 'index.html', 'manifest.webmanifest', 'icona-180.png', 'icona-192.png', 'icona-512.png', 'vendor/html2canvas.min.js', 'vendor/jspdf.umd.min.js'];

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

function dataLocale() {
  var d = new Date(), m = d.getMonth() + 1, g = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (g < 10 ? '0' : '') + g;
}

/* Promemoria: la push arriva senza contenuto, il testo lo sceglie questo file dall'ora locale del telefono. */
self.addEventListener('push', function (e) {
  var mattina = new Date().getHours() < 16;
  var testo = mattina ? 'Diary card: com’è andata la mattina?' : 'Diary card: com’è andato il pomeriggio?';
  /* un'etichetta per giorno e momento: iOS ignora renotify e un'etichetta ripetuta sostituisce in silenzio quella del giorno prima */
  e.waitUntil(self.registration.showNotification('Diario GET', {
    body: testo, icon: 'icona-192.png', badge: 'icona-192.png', tag: 'diario-' + dataLocale() + (mattina ? '-mattina' : '-pomeriggio'), renotify: true, data: { url: './#diary' }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = new URL('./#diary', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (lista) {
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].url.indexOf(self.registration.scope) === 0) {
        var c = lista[i];
        return c.focus().then(function (w) {
          w = w || c;
          try { w.postMessage({ tipo: 'diario-vai' }); } catch (x) {}
          if (w.navigate) return w.navigate(url).catch(function () {});
        }).catch(function () { return self.clients.openWindow(url); });
      }
    }
    return self.clients.openWindow(url);
  }));
});
