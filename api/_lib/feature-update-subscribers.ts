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

export type FeatureUpdateSubscriber = {
  accountEmail: string;
  notifyEmail: string;
  userId?: string;
};

export type FeatureUpdateSubscriberIdentity = {
  accountEmail?: string;
  userId?: string;
};

export type FeatureUpdateSubscriberStore = {
  subscribers: FeatureUpdateSubscriber[];
  lastNotifiedVersion?: string;
};

export type SubscriberStoreAdapter = {
  read: () => Promise<FeatureUpdateSubscriberStore>;
  write: (store: FeatureUpdateSubscriberStore) => Promise<void>;
};

const emptyStore = (): FeatureUpdateSubscriberStore => ({ subscribers: [] });

let memoryStore: FeatureUpdateSubscriberStore | null = null;
let localAdapter: SubscriberStoreAdapter | null = null;

/** Vite dev gắn adapter filesystem — không import node:* trong Edge. */
export const setLocalSubscriberStoreAdapter = (adapter: SubscriberStoreAdapter | null): void => {
  localAdapter = adapter;
};

export const normalizeNotifyEmail = (value: string): string => value.trim().toLowerCase();

export const isValidNotifyEmail = (value: string): boolean => EMAIL_RE.test(normalizeNotifyEmail(value));

const normalizeSubscriber = (value: unknown): FeatureUpdateSubscriber | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const notifyEmail =
    typeof record.notifyEmail === 'string'
      ? normalizeNotifyEmail(record.notifyEmail)
      : typeof record.email === 'string'
        ? normalizeNotifyEmail(record.email)
        : '';
  const accountEmail = typeof record.accountEmail === 'string' ? normalizeNotifyEmail(record.accountEmail) : '';
  const userId = typeof record.userId === 'string' ? record.userId.trim() : '';

  if (!isValidNotifyEmail(notifyEmail) || (!accountEmail && !userId)) {
    return null;
  }

  return {
    accountEmail,
    notifyEmail,
    ...(userId ? { userId } : {}),
  };
};

const subscribersFromLegacy = (record: Record<string, unknown>): FeatureUpdateSubscriber[] => {
  const subscribers: FeatureUpdateSubscriber[] = [];

  if (record.byUser && typeof record.byUser === 'object' && !Array.isArray(record.byUser)) {
    for (const [userId, email] of Object.entries(record.byUser as Record<string, unknown>)) {
      const id = userId.trim();
      const notifyEmail = typeof email === 'string' ? normalizeNotifyEmail(email) : '';
      if (id && isValidNotifyEmail(notifyEmail)) {
        subscribers.push({ accountEmail: '', notifyEmail, userId: id });
      }
    }
  }

  if (Array.isArray(record.emails)) {
    for (const email of record.emails) {
      const notifyEmail = typeof email === 'string' ? normalizeNotifyEmail(email) : '';
      if (isValidNotifyEmail(notifyEmail)) {
        subscribers.push({ accountEmail: '', notifyEmail, userId: `legacy:${notifyEmail}` });
      }
    }
  }

  return subscribers;
};

const mergeSubscribers = (items: FeatureUpdateSubscriber[]): FeatureUpdateSubscriber[] => {
  const byAccount = new Map<string, FeatureUpdateSubscriber>();
  const byUser = new Map<string, FeatureUpdateSubscriber>();
  const result: FeatureUpdateSubscriber[] = [];

  for (const item of items) {
    if (item.accountEmail) {
      const existing = byAccount.get(item.accountEmail);
      if (existing) {
        existing.notifyEmail = item.notifyEmail;
        if (item.userId) {
          existing.userId = item.userId;
        }
        continue;
      }
      byAccount.set(item.accountEmail, item);
      if (item.userId) {
        byUser.set(item.userId, item);
      }
      result.push(item);
      continue;
    }

    if (item.userId) {
      const existing = byUser.get(item.userId);
      if (existing) {
        existing.notifyEmail = item.notifyEmail;
        continue;
      }
      byUser.set(item.userId, item);
      result.push(item);
    }
  }

  return result;
};

const normalizeStore = (value: unknown): FeatureUpdateSubscriberStore => {
  if (!value || typeof value !== 'object') {
    return emptyStore();
  }

  const record = value as Record<string, unknown>;
  const fromArray = Array.isArray(record.subscribers)
    ? record.subscribers.map(normalizeSubscriber).filter((item): item is FeatureUpdateSubscriber => item !== null)
    : [];
  const subscribers = mergeSubscribers([...fromArray, ...subscribersFromLegacy(record)]);
  const lastNotifiedVersion =
    typeof record.lastNotifiedVersion === 'string' ? record.lastNotifiedVersion.trim() : undefined;

  return lastNotifiedVersion ? { subscribers, lastNotifiedVersion } : { subscribers };
};

export const listNotifyEmails = (store: FeatureUpdateSubscriberStore): string[] => [
  ...new Set(store.subscribers.map((item) => item.notifyEmail).filter((email) => isValidNotifyEmail(email))),
];

export const findSubscriber = (
  store: FeatureUpdateSubscriberStore,
  identity: FeatureUpdateSubscriberIdentity,
): FeatureUpdateSubscriber | undefined => {
  const accountEmail = identity.accountEmail ? normalizeNotifyEmail(identity.accountEmail) : '';
  const userId = identity.userId?.trim() ?? '';

  if (accountEmail) {
    const byAccount = store.subscribers.find((item) => item.accountEmail === accountEmail);
    if (byAccount) {
      return byAccount;
    }
  }

  if (userId) {
    return store.subscribers.find((item) => item.userId === userId);
  }

  return undefined;
};

export const getNotifyEmailForAccount = (
  store: FeatureUpdateSubscriberStore,
  identity: FeatureUpdateSubscriberIdentity,
): string => findSubscriber(store, identity)?.notifyEmail ?? '';

const readStoredJson = async (
  url: string,
  token: string,
): Promise<FeatureUpdateSubscriberStore | null> => {
  const result = await readBlobJson<unknown>(url, token, { timeoutMs: BLOB_READ_TIMEOUT_MS });
  if (!result.ok) {
    return result.status === 404 ? emptyStore() : null;
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
      return emptyStore();
    }

    return (await readStoredJson(blob.url, token)) ?? emptyStore();
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

  return emptyStore();
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
  identity?: FeatureUpdateSubscriberIdentity,
): Promise<{ added: boolean; persisted: boolean; store: FeatureUpdateSubscriberStore }> => {
  const notifyEmail = normalizeNotifyEmail(email);
  if (!isValidNotifyEmail(notifyEmail)) {
    throw new Error('Invalid email');
  }

  const accountEmail = identity?.accountEmail ? normalizeNotifyEmail(identity.accountEmail) : '';
  const userId = identity?.userId?.trim() ?? '';
  if (!accountEmail && !userId) {
    throw new Error('Account email is required');
  }

  const store = await readFeatureUpdateSubscribers();
  const existing = findSubscriber(store, { accountEmail, userId });
  const nextSubscriber: FeatureUpdateSubscriber = {
    accountEmail: accountEmail || existing?.accountEmail || '',
    notifyEmail,
    ...(userId || existing?.userId ? { userId: userId || existing?.userId } : {}),
  };

  const subscribers = existing
    ? store.subscribers.map((item) => (item === existing ? nextSubscriber : item))
    : [...store.subscribers, nextSubscriber];

  const next: FeatureUpdateSubscriberStore = {
    subscribers,
    lastNotifiedVersion: store.lastNotifiedVersion ?? currentVersion?.trim() ?? undefined,
  };

  const unchanged =
    Boolean(existing) &&
    existing.notifyEmail === notifyEmail &&
    existing.accountEmail === nextSubscriber.accountEmail &&
    existing.userId === nextSubscriber.userId &&
    next.lastNotifiedVersion === store.lastNotifiedVersion;

  if (!unchanged) {
    await writeFeatureUpdateSubscribers(next);
  }

  memoryStore = next;
  return { added: !existing, persisted: hasSubscriberPersistence(), store: next };
};

export const removeFeatureUpdateSubscriber = async (
  email: string,
  identity?: FeatureUpdateSubscriberIdentity,
): Promise<boolean> => {
  const notifyEmail = normalizeNotifyEmail(email);
  const store = await readFeatureUpdateSubscribers();
  const matched = findSubscriber(store, identity ?? {});
  const subscribers = matched
    ? store.subscribers.filter((item) => item !== matched)
    : store.subscribers.filter((item) => item.notifyEmail !== notifyEmail);

  if (subscribers.length === store.subscribers.length) {
    return false;
  }

  await writeFeatureUpdateSubscribers({
    ...store,
    subscribers,
  });
  return true;
};
