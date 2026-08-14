import { getEnv } from './email.js';
import {
  blobPathnameCandidates,
  getBlobToken,
  listBlobs,
  privateBlobFileUrl,
  putBlobJson,
  readBlobJson,
} from './vercel-blob.js';

const BLOB_PATHNAME = 'feature-updates/subscribers.json';
const BLOB_READ_TIMEOUT_MS = 3000;

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

export const normalizeNotifyEmail = (value: string): string => value.trim().toLowerCase();

export const isValidNotifyEmail = (value: string): boolean => EMAIL_RE.test(normalizeNotifyEmail(value));

const normalizeStore = (value: unknown): FeatureUpdateSubscriberStore => {
  if (!value || typeof value !== 'object') {
    return { ...EMPTY_STORE };
  }

  const record = value as Record<string, unknown>;
  const emails = Array.isArray(record.emails)
    ? [
        ...new Set(
          record.emails
            .map((email) => (typeof email === 'string' ? normalizeNotifyEmail(email) : ''))
            .filter((email) => isValidNotifyEmail(email)),
        ),
      ]
    : [];
  const lastNotifiedVersion =
    typeof record.lastNotifiedVersion === 'string' ? record.lastNotifiedVersion.trim() : undefined;

  return lastNotifiedVersion ? { emails, lastNotifiedVersion } : { emails };
};

const readStoredJson = async (
  url: string,
  token: string,
): Promise<FeatureUpdateSubscriberStore | null> => {
  const result = await readBlobJson<unknown>(url, token, { timeoutMs: BLOB_READ_TIMEOUT_MS });
  if (!result.ok) {
    return result.status === 404 ? { ...EMPTY_STORE } : null;
  }

  return normalizeStore(result.value);
};

const readBlobStore = async (): Promise<FeatureUpdateSubscriberStore | null> => {
  const token = getBlobToken();
  if (!token) {
    return null;
  }

  try {
    for (const pathname of blobPathnameCandidates(BLOB_PATHNAME)) {
      const directUrl = privateBlobFileUrl(pathname, token);
      if (directUrl) {
        const direct = await readStoredJson(directUrl, token);
        if (direct) {
          return direct;
        }
      }
    }

    const listed = await listBlobs('feature-updates', { limit: 20, timeoutMs: BLOB_READ_TIMEOUT_MS });
    const blob = listed.find((item) =>
      blobPathnameCandidates(BLOB_PATHNAME).some(
        (pathname) => item.pathname === pathname || item.pathname?.endsWith(`/${pathname}`),
      ),
    );
    if (!blob?.url) {
      return { ...EMPTY_STORE };
    }

    return (await readStoredJson(blob.url, token)) ?? { ...EMPTY_STORE };
  } catch {
    return null;
  }
};

export const getSubscriberStorage = (): 'blob' | 'local' | 'none' => {
  if (getBlobToken()) {
    return 'blob';
  }

  if (!isVercelRuntime() && localAdapter) {
    return 'local';
  }

  return 'none';
};

export const hasSubscriberPersistence = (): boolean => getSubscriberStorage() !== 'none';

export const readFeatureUpdateSubscribers = async (): Promise<FeatureUpdateSubscriberStore> => {
  const token = getBlobToken();
  if (token) {
    const stored = await readBlobStore();
    if (stored) {
      memoryStore = stored;
      return stored;
    }

    if (memoryStore) {
      return memoryStore;
    }

    throw new Error('Could not read subscriber list from Blob');
  }

  if (!isVercelRuntime() && localAdapter) {
    const store = normalizeStore(await localAdapter.read());
    memoryStore = store;
    return store;
  }

  if (memoryStore) {
    return memoryStore;
  }

  return { ...EMPTY_STORE };
};

export const writeFeatureUpdateSubscribers = async (store: FeatureUpdateSubscriberStore): Promise<void> => {
  const next = normalizeStore(store);
  const token = getBlobToken();

  if (token) {
    await putBlobJson(BLOB_PATHNAME, next, { access: 'private' });

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

  if (isVercelRuntime()) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  }

  memoryStore = next;
};

export const addFeatureUpdateSubscriber = async (
  email: string,
  currentVersion?: string,
): Promise<{ added: boolean; persisted: boolean; store: FeatureUpdateSubscriberStore }> => {
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

  memoryStore = next;
  return { added: !exists, persisted: hasSubscriberPersistence(), store: next };
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
