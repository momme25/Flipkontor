/* Flipkontor: Offline-Modus.
   Holt Seiten wenn möglich frisch aus dem Netz (damit Updates sofort ankommen)
   und legt sie dabei im Zwischenspeicher ab. Ohne Netz kommt die gespeicherte Fassung. */
const CACHE = "flipkontor-v2";
const START = ["./", "index.html", "app.html", "app/", "impressum.html", "datenschutz.html", "nutzungsbedingungen.html", "manifest.webmanifest", "icon-180.png", "icon-512.png"];
const TIMEOUT = 4000; // langsames Netz (Flohmarkt): nach 4 s die gespeicherte Fassung zeigen

self.addEventListener("install", ev => {
  ev.waitUntil(caches.open(CACHE).then(c => Promise.all(START.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", ev => {
  ev.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", ev => {
  const req = ev.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return; // fremde Adressen (z. B. Zähler) nicht anfassen
  ev.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // immer beim Server nachfragen (nicht den Browser-Zwischenspeicher nehmen), damit Updates sofort ankommen
    const net = fetch(req.url, {cache: "no-cache", credentials: "same-origin"}).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; });
    const cached = await cache.match(req, {ignoreSearch: true});
    if (!cached) return net.catch(() => req.mode === "navigate" ? cache.match("app.html").then(r => r || cache.match("app/")) : Response.error());
    const timer = new Promise(res => setTimeout(() => res(cached), TIMEOUT));
    return Promise.race([net.catch(() => cached), timer]);
  })());
});
