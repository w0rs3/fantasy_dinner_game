const CACHE_NAME = 'adventure-dinner-v1.4.0';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest?v=1.4.0',
  './assets/seafaring-adventure.webp',
  './assets/location-scenes/tapas-harbour-basin.jpg',
  './assets/location-scenes/tapas-lighthouse.jpg',
  './assets/location-scenes/tapas-village-square.jpg',
  './assets/location-scenes/tapas-market-lane.jpg',
  './assets/location-scenes/tapas-olive-grove.jpg',
  './assets/location-scenes/tapas-smugglers-pier.jpg',
  './assets/location-scenes/soup-locations-atlas.jpg',
  './assets/location-scenes/salad-locations-atlas.jpg',
  './assets/location-scenes/main-locations-atlas.jpg',
  './assets/location-scenes/dessert-locations-atlas.jpg',
  './assets/location-scenes/cocktails-locations-atlas.jpg',
  './css/base.css?v=1.4.0',
  './css/layout.css?v=1.4.0',
  './css/components.css?v=1.4.0',
  './css/animations.css?v=1.4.0',
  './js/app.bundle.js?v=1.4.0',
  './js/app.js',
  './js/config.js',
  './js/core/audio.js',
  './js/core/game-engine.js',
  './js/core/random.js',
  './js/core/storage.js',
  './js/core/timers.js',
  './js/data/chapters.js',
  './js/data/story-events.js',
  './js/data/events.js',
  './js/data/i18n.js',
  './js/data/ingredients.js',
  './js/data/roles.js',
  './js/data/tasks.js',
  './js/ui/dialog.js',
  './js/ui/game.js',
  './js/ui/helpers.js',
  './js/ui/overlays.js',
  './js/ui/welcome.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then((response) => {
      if (!response || response.status !== 200 || response.type === 'opaque') return response;
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
