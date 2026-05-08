// sw.js — BloomBuddy Service Worker
// Provides offline caching and enables PWA install

const CACHE_NAME = 'bloombuddy-v1';
const STATIC_ASSETS = [
  '/',
  '/dashboard.html',
  '/journal.html',
  '/prayer-wall.html',
  '/resources.html',
  '/podcasts.html',
  '/profile.html',
  '/styles.css',
  '/dashboard.css',
  '/journal.css',
  '/prayer-wall.css',
  '/content-pages.css',
  '/profile.css',
  '/toast-notifications.css',
  '/Images/favicon.png',
  '/Images/BB-logo.png',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests and API calls
  if (request.method !== 'GET') return;
  if (request.url.includes('/api/')) return;
  if (request.url.includes('firestore.googleapis.com')) return;
  if (request.url.includes('firebase')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(request);
      })
  );
});
