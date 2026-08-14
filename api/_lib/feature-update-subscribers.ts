import { getEnv } from './email.js';

const BLOB_PATHNAME = 'feature-updates/subscribers.json';
const BLOB_API_URL = 'https://vercel.com/api/blob';
const BLOB_API_VERSION = '7';
const BLOB_READ_TIMEOUT_MS = 8000;
const BLOB_WRITE_TIMEOUT_MS = 8000;

const isVercelRuntime = (): boolean => getEnv('VERCEL') === '1';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FeatureUpdateSubscriberStore = {
  emails: string[];
  lastNotifiedVersion?: string;
};

export type SubscriberStoreAdapter = {
  read: () => Promise<FeatureUpdateSubscriberStore>;
  write: (store: FeatureUpdateSubscriberStore) => Promise<void>;
};

const EMPTY_STORE: FeatureUpdateSubscriberStore = { emails: [] };

let memoryStore: FeatureUpdateSubscriberStore | null = null;
let localAdapter: SubscriberStoreAdapter | null = null;

/** Vite dev gắn adapter filesystem — không import node:* trong Edge. */
export const setLocalSubscriberStoreAdapter = (adapter: SubscriberStoreAdapter | null): void => {
  localAdapter = adapter;
};

const fetchWithTimeout = async (url: string, init: RequestInit, ms: number): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

export const normalizeNotifyEmail = (value: string): string => value.trim().toLowerCase();

export const isValidNotifyEmail = (value: string): boolean => EMAIL_RE.test(normalizeNotifyEmail(value));

const normalizeStore = (value: unknown): FeatureUpdateSubscriberStore => {
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_STORE };
  }

  const record = value as Record<string, unknown>;
  const emails = Array.isArray(record.emails)
    ? [...new Set(record.emails.map((email) => (typeof email === 'string' ? normalizeNotifyEmail(email) : '')).filter((email) => isValidNotifyEmail(email)))]
    : [];
  const lastNotifiedVersion =
    typeof record.lastNotifiedVersion === 'string' ? record.lastNotifiedVersion.trim() : undefined;

  return lastNotifiedVersion ? { emails, lastNotifiedVersion } : { emails };
};

const readBlobStore = async (): Promise<FeatureUpdateSubscriberStore | null> => {
  const token = getEnv('BLOB_READ_WRITE_TOKEN');
  if (!token) {
    return null;
  }

  try {
    const listParams = new URLSearchParams({ prefix: BLOB_PATHNAME, limit: '20' });
    const listResponse = await fetchWithTimeout(
      `${BLOB_API_URL}?${listParams.toString()}`,
      {
        headers: {
          authorization: `Bearer ${token}`,
          'x-api-version': BLOB_API_VERSION,
        },
      },
      BLOB_READ_TIMEOUT_MS,
    );

    if (!listResponse.ok) {
      return null;
    }

    const listed = (await listResponse.json()) as { blobs?: Array<{ pathname?: string; url?: string }> };
    const blob = listed.blobs?.find(
      (item) => item.pathname === BLOB_PATHNAME || item.pathname?.endsWith(`/${BLOB_PATHNAME}`),
    );
    if (!blob?.url) {
      return { ...EMPTY_STORE };
    }

    const fileResponse = await fetchWithTimeout(
      blob.url,
      {
        cache: 'no-store',
        headers: { authorization: `Bearer ${token}` },
      },
      BLOB_READ_TIMEOUT_MS,
    );

    if (!fileResponse.ok) {
      return fileResponse.status === 404 ? { ...EMPTY_STORE } : null;
    }

    return normalizeStore(await fileResponse.json());
  } catch {
    return null;
  }
};

export const readFeatureUpdateSubscribers = async (): Promise<FeatureUpdateSubscriberStore> => {
  if (memoryStore) {
    return memoryStore;
  }

  const token = getEnv('BLOB_READ_WRITE_TOKEN');
  if (token) {
    const stored = await readBlobStore();
    if (stored) {
      memoryStore = stored;
      return memoryStore;
    }

    if (isVercelRuntime()) {
      throw new Error('Could not read subscriber list from Blob');
    }
  }

  if (!isVercelRuntime() && localAdapter) {
    memoryStore = normalizeStore(await localAdapter.read());
    return memoryStore;
  }

  throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
};

export const writeFeatureUpdateSubscribers = async (store: FeatureUpdateSubscriberStore): Promise<void> => {
  const next = normalizeStore(store);
  const token = getEnv('BLOB_READ_WRITE_TOKEN');

  if (token) {
    const params = new URLSearchParams({ pathname: BLOB_PATHNAME });
    const response = await fetchWithTimeout(
      `${BLOB_API_URL}/?${params.toString()}`,
      {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${token}`,
          'x-api-version': BLOB_API_VERSION,
          'x-content-type': 'application/json',
          'x-add-random-suffix': '0',
          'x-allow-overwrite': '1',
          'x-vercel-blob-access': 'private',
        },
        body: JSON.stringify(next, null, 2),
      },
      BLOB_WRITE_TIMEOUT_MS,
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Blob put failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`);
    }

    memoryStore = next;
    if (!isVercelRuntime() && localAdapter) {
      await localAdapter.write(next).catch((error) => {
        console.warn('[feature-update-subscribers] local mirror failed', error);
      });
    }
    return;
  }

  if (!isVercelRuntime() && localAdapter) {
    await localAdapter.write(next);
    memoryStore = next;
    return;
  }

  throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
};

export const addFeatureUpdateSubscriber = async (
  email: string,
  currentVersion?: string,
): Promise<{ added: boolean; store: FeatureUpdateSubscriberStore }> => {
  const normalized = normalizeNotifyEmail(email);
  if (!isValidNotifyEmail(normalized)) {
    throw new Error('Invalid email');
  }

  const store = await readFeatureUpdateSubscribers();
  const exists = store.emails.includes(normalized);
  const next: FeatureUpdateSubscriberStore = {
    emails: exists ? store.emails : [...store.emails, normalized],
    lastNotifiedVersion: store.lastNotifiedVersion ?? currentVersion?.trim() ?? undefined,
  };

  if (!exists || next.lastNotifiedVersion !== store.lastNotifiedVersion) {
    await writeFeatureUpdateSubscribers(next);
  }

  return { added: !exists, store: next };
};

export const removeFeatureUpdateSubscriber = async (email: string): Promise<boolean> => {
  const normalized = normalizeNotifyEmail(email);
  const store = await readFeatureUpdateSubscribers();
  if (!store.emails.includes(normalized)) {
    return false;
  }

  await writeFeatureUpdateSubscribers({
    ...store,
    emails: store.emails.filter((item) => item !== normalized),
  });
  return true;
};
