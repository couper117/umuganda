/**
 * sw.js — offline support for the public site.
 *
 * Deliberately modest. Stylesheets and scripts come from the network when there
 * is one, so a release is never hidden behind a stale copy, and from the cache
 * when there is not. Fonts and images, which rarely change, are served from cache
 * and refreshed in the background. HTML is never
 * cached: pages carry a CSRF token tied to the visitor's session, and a stale
 * copy would fail on submit in a way nobody could explain. With no connection a
 * page request gets the offline notice instead, and a half-written report is
 * safe regardless, because app.js keeps the draft on the device.
 *
 * Staff pages, sign-in, report photos and tracker lookups are never touched:
 * none of them should ever be answered from a cache on a shared phone.
 */

'use strict';

const CACHE = 'ck-static-v2';
const OFFLINE_URL = '/offline.html';

const PRECACHE = [
  OFFLINE_URL,
  '/style.css',
  '/js/shell.js',
  '/js/app.js',
  '/fonts/bricolage-latin.woff2',
  '/fonts/figtree-latin.woff2',
  '/icons/icon-192.png',
];

const NEVER = /^\/(admin|login|logout|setup|media|healthz)(\/|$)/;
const STATIC = /\.(css|js|woff2|png|jpg|svg|webmanifest)$/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || NEVER.test(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Code first from the network, so a new release shows up straight away.
  if (/\.(css|js)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cache.match(request)),
      ),
    );
    return;
  }

  if (STATIC.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const refresh = fetch(request)
            .then((response) => {
              if (response.ok) cache.put(request, response.clone());
              return response;
            })
            .catch(() => cached);
          return cached || refresh;
        }),
      ),
    );
  }
});
