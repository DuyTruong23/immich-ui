import { getEnv } from './email.js';
import {
  blobPathnameCandidates,
  getBlobToken,
  listBlobs,
  privateBlobFileUrl,
  putBlobJson,
  readBlobJson,
} from './vercel-blob.js';

const BLOB_PATHNAME = 'blocked-users.json';
const BLOB_READ_TIMEOUT_MS = 3000;

const isVercelRuntime = (): boolean => getEnv('VERCEL') === '1';

export type BlockedUsersStore = {
  blockedUserIds: string[];
};

export type BlockedUsersStoreAdapter = {
  read: () => Promise<BlockedUsersStore>;
  write: (store: BlockedUsersStore) => Promise<void>;
};

const emptyStore = (): BlockedUsersStore => ({ blockedUserIds: [] });

let memoryStore: BlockedUsersStore | null = null;
let localAdapter: BlockedUsersStoreAdapter | null = null;

/** Vite dev gắn adapter filesystem — không import node:* trong Edge. */
export const setLocalBlockedUsersStoreAdapter = (adapter: BlockedUsersStoreAdapter | null): void => {
  localAdapter = adapter;
};

const normalizeStore = (value: unknown): BlockedUsersStore => {
  if (!value || typeof value !== 'object') {
    return emptyStore();
  }

  const record = value as Record<string, unknown>;
  const blockedUserIds = Array.isArray(record.blockedUserIds)
    ? record.blockedUserIds
        .map((id) => (typeof id === 'string' ? id.trim() : ''))
        .filter((id) => id.length > 0)
    : [];

  return { blockedUserIds };
};

const readStoredJson = async (
  url: string,
  token: string,
): Promise<BlockedUsersStore | null> => {
  const result = await readBlobJson<unknown>(url, token, { timeoutMs: BLOB_READ_TIMEOUT_MS });
  if (!result.ok) {
    return result.status === 404 ? emptyStore() : null;
  }

  return normalizeStore(result.value);
};

const readBlobStore = async (): Promise<BlockedUsersStore | null> => {
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

    const listed = await listBlobs('', { limit: 20, timeoutMs: BLOB_READ_TIMEOUT_MS });
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

export const getBlockedUsersStorage = (): 'blob' | 'local' | 'none' => {
  if (getBlobToken()) {
    return 'blob';
  }

  if (!isVercelRuntime() && localAdapter) {
    return 'local';
  }

  return 'none';
};

export const hasBlockedUsersPersistence = (): boolean => getBlockedUsersStorage() !== 'none';

export const readBlockedUsers = async (): Promise<BlockedUsersStore> => {
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

    throw new Error('Could not read blocked users list from Blob');
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

export const writeBlockedUsers = async (store: BlockedUsersStore): Promise<void> => {
  const next = normalizeStore(store);
  const token = getBlobToken();

  if (token) {
    await putBlobJson(BLOB_PATHNAME, next, { access: 'private' });

    memoryStore = next;
    if (!isVercelRuntime() && localAdapter) {
      await localAdapter.write(next).catch((error) => {
        console.warn('[blocked-users-store] local mirror failed', error);
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

export const addBlockedUser = async (userId: string): Promise<{ persisted: boolean }> => {
  const id = userId.trim();
  if (!id) {
    throw new Error('User ID is required');
  }

  const store = await readBlockedUsers();
  if (store.blockedUserIds.includes(id)) {
    return { persisted: hasBlockedUsersPersistence() };
  }

  const next: BlockedUsersStore = {
    blockedUserIds: [...store.blockedUserIds, id],
  };

  await writeBlockedUsers(next);
  memoryStore = next;
  return { persisted: hasBlockedUsersPersistence() };
};

export const removeBlockedUser = async (userId: string): Promise<{ persisted: boolean }> => {
  const id = userId.trim();
  if (!id) {
    throw new Error('User ID is required');
  }

  const store = await readBlockedUsers();
  const blockedUserIds = store.blockedUserIds.filter((item) => item !== id);

  if (blockedUserIds.length === store.blockedUserIds.length) {
    return { persisted: hasBlockedUsersPersistence() };
  }

  const next: BlockedUsersStore = { blockedUserIds };
  await writeBlockedUsers(next);
  memoryStore = next;
  return { persisted: hasBlockedUsersPersistence() };
};

export const isUserBlocked = async (userId: string): Promise<boolean> => {
  const id = userId.trim();
  if (!id) {
    return false;
  }

  const store = await readBlockedUsers();
  return store.blockedUserIds.includes(id);
};

export const listBlockedUsers = async (): Promise<string[]> => {
  const store = await readBlockedUsers();
  return store.blockedUserIds;
};
