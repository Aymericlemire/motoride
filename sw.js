const STATIC_CACHE = "mototrack-static-v4";
const DATA_CACHE = "mototrack-data-v4";
const OFFLINE_QUEUE = "mototrack-offline-messages";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/css/design-system.css",
  "./assets/css/app.css",
  "./assets/css/map.css",
  "./assets/css/social.css",
  "./assets/css/stats.css",
  "./assets/css/auth.css",
  "./assets/js/app.js",
  "./assets/js/navigation.js",
  "./assets/js/auth.js",
  "./assets/js/map.js",
  "./assets/js/layers.js",
  "./assets/js/clustering.js",
  "./assets/js/routing.js",
  "./assets/js/social.js",
  "./assets/js/chat.js",
  "./assets/js/groups.js",
  "./assets/js/circuits.js",
  "./assets/js/weather.js",
  "./assets/js/stats.js",
  "./assets/js/tracking.js",
  "./assets/js/bluetooth.js",
  "./assets/js/intercom-bridge.js",
  "./assets/js/test-ride.js",
  "./assets/js/load-data.js",
  "./assets/data/moto-tracks.json",
  "./assets/icons/icon-192x192.svg",
  "./assets/icons/icon-512x512.svg",
  "./assets/icons/splash-mobile.svg",
  "./firebase-config.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => ![STATIC_CACHE, DATA_CACHE].includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isFirebaseOrApi(url) {
  return url.includes("firebaseio.com") || url.includes("googleapis.com") || url.includes("openweathermap.org");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = request.url;

  if (request.method !== "GET") return;

  if (isFirebaseOrApi(url) || url.includes("/assets/data/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(DATA_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-offline-messages") event.waitUntil(flushOfflineMessages());
});

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : { title: "MotoTrack", body: "Nouveau message rider." };
  event.waitUntil(
    self.registration.showNotification(payload.title || "MotoTrack", {
      body: payload.body || "Notification",
      icon: "assets/icons/icon-192x192.png",
      badge: "assets/icons/icon-96x96.png"
    })
  );
});

async function flushOfflineMessages() {
  const cache = await caches.open(OFFLINE_QUEUE);
  const requests = await cache.keys();
  await Promise.all(
    requests.map(async (request) => {
      try {
        await fetch(request.clone());
        await cache.delete(request);
      } catch {
        // Laisse l'entrée pour le prochain sync.
      }
    })
  );
}
