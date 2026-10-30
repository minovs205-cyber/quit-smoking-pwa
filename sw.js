const cacheName = 'quit-smoking-v4';

// Относительные пути — работают в любом контексте
const assetsToCache = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.webmanifest',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', (event) => {
    console.log('SW: установка');
    event.waitUntil(
        caches.open(cacheName)
            .then((cache) => {
                console.log('SW: кэширование');
                return cache.addAll(assetsToCache);
            })
            .catch(err => console.error('SW: ошибка кэширования', err))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('SW: активация');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== cacheName) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) return response;
                return fetch(event.request);
            })
            .catch(() => {
                // Если запрос не удался — отдаем главную страницу
                return caches.match('./index.html');
            })
    );
});