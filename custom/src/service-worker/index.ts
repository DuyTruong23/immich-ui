/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { installMessageListener } from './messaging';
import { handleFetch as handleAssetFetch } from './request';

const ASSET_REQUEST_REGEX = /^\/api\/assets\/[a-f0-9-]+\/(original|thumbnail)/;
const THUMBNAIL_PATH_REGEX = /\/api\/assets\/[a-f0-9-]+\/thumbnail/;
const THUMB_CACHE = 'pg-thumbs-v1';
const THUMB_CACHE_LIMIT = 400;

const sw = globalThis as unknown as ServiceWorkerGlobalScope;

const handleActivate = (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== THUMB_CACHE && key.startsWith('pg-thumbs-')).map((key) => caches.delete(key)));
      await sw.clients.claim();
    })(),
  );
};

const handleInstall = (event: ExtendableEvent) => {
  event.waitUntil(sw.skipWaiting());
};

const cacheKeyFor = (request: Request) => {
  const url = new URL(request.url);
  return new Request(`${url.origin}${url.pathname}`, { method: 'GET' });
};

const pruneCache = async (cache: Cache) => {
  const keys = await cache.keys();
  if (keys.length <= THUMB_CACHE_LIMIT) {
    return;
  }

  await Promise.all(keys.slice(0, keys.length - THUMB_CACHE_LIMIT).map((request) => cache.delete(request)));
};

const cacheFirstThumbnail = async (request: Request): Promise<Response> => {
  const cache = await caches.open(THUMB_CACHE);
  const cacheKey = cacheKeyFor(request);
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await handleAssetFetch(request);
  if (response.ok || response.type === 'opaque') {
    try {
      await cache.put(cacheKey, response.clone());
      await pruneCache(cache);
    } catch {
      // Quota or opaque response — ignore
    }
  }

  return response;
};

const handleFetch = (event: FetchEvent): void => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  if (THUMBNAIL_PATH_REGEX.test(url.pathname)) {
    event.respondWith(cacheFirstThumbnail(event.request));
    return;
  }

  if (url.origin === globalThis.location.origin && ASSET_REQUEST_REGEX.test(url.pathname)) {
    event.respondWith(handleAssetFetch(event.request));
  }
};

sw.addEventListener('install', handleInstall, { passive: true });
sw.addEventListener('activate', handleActivate, { passive: true });
sw.addEventListener('fetch', handleFetch, { passive: true });
installMessageListener();
