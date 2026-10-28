const cacheName = 'quit-smoking-v1';
const assetsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.webmanifest',
    '/icon-192.png',
    '/icon-512.png'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker: установка...');
    event.waitUntil(
        caches.open(cacheName)
            .then((cache) => {
                console.log('Service Worker: кэширование файлов');
                return cache.addAll(assetsToCache);
            })
    );
});

// Активация
self.addEventListener('activate', (event) => {
    console.log('Service Worker: активация');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== cacheName) {
                        console.log('Service Worker: удаление старого кэша');
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
            .catch(() => {
                return caches.match('/index.html');
            })
    );
});