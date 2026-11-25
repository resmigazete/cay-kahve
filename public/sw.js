// Basit PWA servis çalışanı: uygulama kabuğunu önbelleğe alır.
// Firestore / Auth istekleri asla önbelleğe alınmaz (gerçek zamanlı veri).
const CACHE = 'cay-kahve-v5';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/app.js', 'js/firebase.js', 'js/firebase-config.js', 'js/util.js', 'js/data.js',
  'js/drink-art.js', 'js/version.js', 'js/store.js', 'js/customer.js', 'js/resmi-tatiller.js', 'js/admin.js', 'js/stats.js', 'js/qr.js',
  'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const staticCdn = /(^|\.)gstatic\.com$|(^|\.)jsdelivr\.net$/.test(url.hostname) && /\.js(\?|$)/.test(url.pathname);
  if (!sameOrigin && !staticCdn) return; // Firestore, Auth vb. doğrudan ağa gider

  // Sürümü sabit (10.14.1) Firebase SDK dosyaları değişmez: önce önbellekten ver, açılışı hızlandırır
  if (!sameOrigin && /gstatic\.com$/.test(url.hostname) && /\/firebasejs\/\d+\.\d+\.\d+\//.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }

  // Önce ağ, olmazsa önbellek (güncel kod her zaman gelsin)
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
  );
});
