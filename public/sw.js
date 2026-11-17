/* Service worker di Stock Radar: shell offline + notifiche push.
   Strategia: network-first per pagine e API (i dati devono essere freschi), cache come ripiego offline. */
const CACHE = 'sr-v1';
// percorso base: '/' nell'app completa, '/NomeRepo/' su GitHub Pages
const BASE = new URL(self.registration.scope).pathname;
const SHELL = [BASE, BASE + 'manifest.webmanifest', BASE + 'icons/icon.svg', BASE + 'icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('sr-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const p = '/' + url.pathname.slice(BASE.length);
  if (p.startsWith('/api/admin') || p.startsWith('/admin')) return;
  const isStatic = p.startsWith('/_next/static') || p.startsWith('/icons/');
  if (isStatic) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
    return;
  }
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (req.mode === 'navigate' || p.startsWith('/api/ticker') || p.startsWith('/api/market') || p.startsWith('/data/'))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match(BASE)))
  );
});
self.addEventListener('push', (e) => {
  let d = { title: 'Stock Radar', body: '', url: BASE };
  try { d = { ...d, ...e.data.json() }; } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title, { body: d.body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data: { url: d.url }, tag: d.tag }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || BASE;
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((ws) => {
    for (const w of ws) if ('focus' in w) { w.navigate(url); return w.focus(); }
    return self.clients.openWindow(url);
  }));
});
