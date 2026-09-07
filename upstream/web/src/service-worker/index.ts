/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { installMessageListener } from './messaging';
import { handleFetch as handleAssetFetch } from './request';

const ASSET_REQUEST_REGEX = /^\/api\/assets\/[a-f0-9-]+\/(original|thumbnail)/;
const THUMBNAIL_PATH_REGEX = /\/api\/assets\/[a-f0-9-]+\/thumbnail/;
const THUMB_CACHE = 'pg-thumbs-v2';

type NetworkConnection = {
  saveData?: boolean;
  effectiveType?: string;
};

const getConnection = (): NetworkConnection | undefined =>
  (navigator as Navigator & { connection?: NetworkConnection }).connection;

const matchesMedia = (query: string): boolean => {
  try {
    return Boolean(globalThis.matchMedia?.(query)?.matches);
  } catch {
    return false;
  }
};

/** Port thuần của getServiceWorkerThumbnailCacheLimit() — không import Svelte. */
const getThumbnailCacheLimit = (): number => {
  const connection = getConnection();
  if (connection?.saveData) {
    return 80;
  }

  const type = connection?.effectiveType;
  if (type === 'slow-2g' || type === '2g' || type === '3g') {
    return 180;
  }

  if (matchesMedia('(pointer: coarse)') || matchesMedia('(max-width: 767px)')) {
    return 280;
  }

  return 400;
};

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
  const size = url.searchParams.get('size') ?? '';
  const cacheBust = url.searchParams.get('c') ?? '';
  return new Request(`${url.origin}${url.pathname}?size=${encodeURIComponent(size)}&c=${encodeURIComponent(cacheBust)}`, {
    method: 'GET',
  });
};

const pruneCache = async (cache: Cache) => {
  const limit = getThumbnailCacheLimit();
  const keys = await cache.keys();
  if (keys.length <= limit) {
    return;
  }

  await Promise.all(keys.slice(0, keys.length - limit).map((request) => cache.delete(request)));
};

const cacheFirstThumbnail = async (request: Request): Promise<Response> => {
  const cache = await caches.open(THUMB_CACHE);
  const cacheKey = cacheKeyFor(request);
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await handleAssetFetch(request);
  // Opaque responses hide 401/204 — caching them locks mobile Safari onto broken thumbs.
  if (response.ok) {
    try {
      await cache.put(cacheKey, response.clone());
      await pruneCache(cache);
    } catch {
      // Quota exceeded — ignore
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
