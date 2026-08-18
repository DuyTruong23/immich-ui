import { getEnv } from './email.js';
import {
  blobPathnameCandidates,
  getBlobToken,
  listBlobs,
  privateBlobFileUrl,
  putBlobJson,
  readBlobJson,
} from './vercel-blob.js';

const BLOB_PATHNAME = 'partner-favorites/store.json';
const BLOB_READ_TIMEOUT_MS = 2500;

const ASSET_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AVATAR_COLORS = new Set([
  'primary',
  'pink',
  'red',
  'yellow',
  'blue',
  'green',
  'purple',
  'orange',
  'gray',
  'amber',
]);

export type PartnerFavoriteUser = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  avatarColor: string;
  profileImagePath: string;
  profileChangedAt: string;
};

export type PartnerFavoriteMark = {
  favoritedAt: string;
  source: 'immich' | 'overlay';
};

export type PartnerFavoriteStore = {
  users: Record<string, PartnerFavoriteUser>;
  favorites: Record<string, Record<string, PartnerFavoriteMark>>;
  shareWithEveryone: Record<string, boolean>;
  clearedFavorites: Record<string, Record<string, true>>;
};

export type PartnerFavoriteItem = {
  assetId: string;
  favoritedAt: string;
  favoritedBy: PartnerFavoriteUser[];
};

let memoryStore: PartnerFavoriteStore | null = null;

const emptyStore = (): PartnerFavoriteStore => ({
  users: {},
  favorites: {},
  shareWithEveryone: {},
  clearedFavorites: {},
});

export const isAssetId = (value: string): boolean => ASSET_ID_RE.test(value);

const asString = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);

export const normalizeFavoriteUser = (value: unknown): PartnerFavoriteUser | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = asString(record.id).trim();
  const email = asString(record.email).trim().toLowerCase();
  if (!id || !email) {
    return null;
  }

  const avatarColor = asString(record.avatarColor, 'primary');
  return {
    id,
    name: asString(record.name).trim() || email,
    email,
    isAdmin: Boolean(record.isAdmin),
    avatarColor: AVATAR_COLORS.has(avatarColor) ? avatarColor : 'primary',
    profileImagePath: asString(record.profileImagePath),
    profileChangedAt: asString(record.profileChangedAt) || new Date().toISOString(),
  };
};

const normalizeMark = (value: unknown): PartnerFavoriteMark | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const favoritedAt = asString(record.favoritedAt);
  if (!favoritedAt) {
    return null;
  }

  return {
    favoritedAt,
    source: record.source === 'immich' ? 'immich' : 'overlay',
  };
};

const normalizeStore = (value: unknown): PartnerFavoriteStore => {
  if (!value || typeof value !== 'object') {
    return emptyStore();
  }

  const record = value as Record<string, unknown>;
  const users: Record<string, PartnerFavoriteUser> = {};
  if (record.users && typeof record.users === 'object') {
    for (const [id, user] of Object.entries(record.users as Record<string, unknown>)) {
      const normalized = normalizeFavoriteUser(user);
      if (normalized) {
        users[id] = normalized;
      }
    }
  }

  const favorites: Record<string, Record<string, PartnerFavoriteMark>> = {};
  if (record.favorites && typeof record.favorites === 'object') {
    for (const [assetId, marks] of Object.entries(record.favorites as Record<string, unknown>)) {
      if (!isAssetId(assetId) || !marks || typeof marks !== 'object') {
        continue;
      }

      const nextMarks: Record<string, PartnerFavoriteMark> = {};
      for (const [userId, mark] of Object.entries(marks as Record<string, unknown>)) {
        const normalized = normalizeMark(mark);
        if (normalized) {
          nextMarks[userId] = normalized;
        }
      }

      if (Object.keys(nextMarks).length > 0) {
        favorites[assetId] = nextMarks;
      }
    }
  }

  const shareWithEveryone: Record<string, boolean> = {};
  if (record.shareWithEveryone && typeof record.shareWithEveryone === 'object') {
    for (const [userId, enabled] of Object.entries(record.shareWithEveryone as Record<string, unknown>)) {
      shareWithEveryone[userId] = enabled === true;
    }
  }

  const clearedFavorites: Record<string, Record<string, true>> = {};
  if (record.clearedFavorites && typeof record.clearedFavorites === 'object') {
    for (const [assetId, usersCleared] of Object.entries(record.clearedFavorites as Record<string, unknown>)) {
      if (!isAssetId(assetId) || !usersCleared || typeof usersCleared !== 'object') {
        continue;
      }

      const nextCleared: Record<string, true> = {};
      if (Array.isArray(usersCleared)) {
        for (const userId of usersCleared) {
          if (typeof userId === 'string' && userId) {
            nextCleared[userId] = true;
          }
        }
      } else {
        for (const [userId, flagged] of Object.entries(usersCleared as Record<string, unknown>)) {
          if (userId && flagged) {
            nextCleared[userId] = true;
          }
        }
      }

      if (Object.keys(nextCleared).length > 0) {
        clearedFavorites[assetId] = nextCleared;
      }
    }
  }

  return { users, favorites, shareWithEveryone, clearedFavorites };
};

const readStoredJson = async (url: string, token: string): Promise<PartnerFavoriteStore | null> => {
  const result = await readBlobJson<unknown>(url, token, { timeoutMs: BLOB_READ_TIMEOUT_MS });
  if (!result.ok) {
    return result.status === 404 ? emptyStore() : null;
  }

  return normalizeStore(result.value);
};

const readBlobStore = async (): Promise<PartnerFavoriteStore | null> => {
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

    const listed = await listBlobs('partner-favorites', { limit: 20, timeoutMs: BLOB_READ_TIMEOUT_MS });
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

export const readPartnerFavorites = async (): Promise<PartnerFavoriteStore> => {
  if (memoryStore) {
    return memoryStore;
  }

  const stored = await readBlobStore();
  memoryStore = stored ?? emptyStore();
  return memoryStore;
};

export const writePartnerFavorites = async (store: PartnerFavoriteStore): Promise<void> => {
  const next = normalizeStore(store);
  memoryStore = next;

  const token = getBlobToken();
  if (!token) {
    if (getEnv('VERCEL') === '1') {
      console.warn('[partner-favorites] BLOB_READ_WRITE_TOKEN missing; store is memory-only');
    }
    return;
  }

  await putBlobJson(BLOB_PATHNAME, next, { access: 'private' });
};

export const upsertFavoriteUser = (store: PartnerFavoriteStore, user: PartnerFavoriteUser): PartnerFavoriteStore => {
  const existing = store.users[user.id];
  const merged: PartnerFavoriteUser = existing
    ? {
        ...existing,
        ...user,
        name: user.name || existing.name,
        email: user.email || existing.email,
        isAdmin: Boolean(user.isAdmin || existing.isAdmin),
        avatarColor: user.avatarColor || existing.avatarColor,
        profileImagePath: user.profileImagePath || existing.profileImagePath,
        profileChangedAt: user.profileChangedAt || existing.profileChangedAt,
      }
    : user;

  return {
    ...store,
    users: { ...store.users, [user.id]: merged },
  };
};

export const setUserFavorite = (
  store: PartnerFavoriteStore,
  assetId: string,
  userId: string,
  favorite: boolean,
  source: PartnerFavoriteMark['source'],
): { store: PartnerFavoriteStore; added: boolean; removed: boolean } => {
  const current = store.favorites[assetId] ?? {};
  const existed = Boolean(current[userId]);

  if (favorite) {
    const cleared = { ...store.clearedFavorites };
    if (cleared[assetId]?.[userId]) {
      const nextClearedUsers = { ...cleared[assetId] };
      delete nextClearedUsers[userId];
      if (Object.keys(nextClearedUsers).length === 0) {
        delete cleared[assetId];
      } else {
        cleared[assetId] = nextClearedUsers;
      }
    }

    if (existed) {
      return { store: { ...store, clearedFavorites: cleared }, added: false, removed: false };
    }

    return {
      store: {
        ...store,
        clearedFavorites: cleared,
        favorites: {
          ...store.favorites,
          [assetId]: {
            ...current,
            [userId]: { favoritedAt: new Date().toISOString(), source },
          },
        },
      },
      added: true,
      removed: false,
    };
  }

  const clearedFavorites = {
    ...store.clearedFavorites,
    [assetId]: {
      ...store.clearedFavorites[assetId],
      [userId]: true as const,
    },
  };

  if (!existed) {
    return { store: { ...store, clearedFavorites }, added: false, removed: false };
  }

  const nextMarks = { ...current };
  delete nextMarks[userId];
  const nextFavorites = { ...store.favorites };
  if (Object.keys(nextMarks).length === 0) {
    delete nextFavorites[assetId];
  } else {
    nextFavorites[assetId] = nextMarks;
  }

  return {
    store: { ...store, favorites: nextFavorites, clearedFavorites },
    added: false,
    removed: true,
  };
};

export const syncUserImmichFavorites = (
  store: PartnerFavoriteStore,
  userId: string,
  assetIds: string[],
): PartnerFavoriteStore => {
  const wanted = new Set(assetIds.filter((id) => isAssetId(id)));
  let next: PartnerFavoriteStore = store;

  for (const [assetId, marks] of Object.entries(store.favorites)) {
    const mark = marks[userId];
    if (mark?.source === 'immich' && !wanted.has(assetId)) {
      next = setUserFavorite(next, assetId, userId, false, 'immich').store;
    }
  }

  for (const assetId of wanted) {
    if (next.clearedFavorites[assetId]?.[userId]) {
      continue;
    }

    const existing = next.favorites[assetId]?.[userId];
    if (!existing) {
      next = setUserFavorite(next, assetId, userId, true, 'immich').store;
      continue;
    }

    if (existing.source !== 'immich') {
      next = {
        ...next,
        favorites: {
          ...next.favorites,
          [assetId]: {
            ...next.favorites[assetId],
            [userId]: { ...existing, source: 'immich' },
          },
        },
      };
    }
  }

  return next;
};

export const setShareWithEveryone = (
  store: PartnerFavoriteStore,
  userId: string,
  enabled: boolean,
): PartnerFavoriteStore => ({
  ...store,
  shareWithEveryone: {
    ...store.shareWithEveryone,
    [userId]: enabled,
  },
});

export const isShareWithEveryone = (store: PartnerFavoriteStore, userId: string): boolean =>
  store.shareWithEveryone[userId] === true;

export const listClearedFavoriteUserIds = (
  store: PartnerFavoriteStore,
): Record<string, string[]> => {
  const listed: Record<string, string[]> = {};
  for (const [assetId, users] of Object.entries(store.clearedFavorites)) {
    const ids = Object.keys(users);
    if (ids.length > 0) {
      listed[assetId] = ids;
    }
  }
  return listed;
};

export const listUserFavoriteAssetIds = (store: PartnerFavoriteStore, userId: string): string[] => {
  const ids: string[] = [];
  for (const [assetId, marks] of Object.entries(store.favorites)) {
    if (marks[userId]) {
      ids.push(assetId);
    }
  }
  return ids;
};

const isSharedFavoriteVisible = (
  store: PartnerFavoriteStore,
  favoritedByUserId: string,
  viewer?: { id?: string; isAdmin: boolean },
): boolean => {
  if (viewer?.isAdmin) {
    return true;
  }
  if (store.users[favoritedByUserId]?.isAdmin) {
    return true;
  }
  return isShareWithEveryone(store, favoritedByUserId);
};

export const buildFavoriteItems = (
  store: PartnerFavoriteStore,
  allowedUserIds: string[],
  viewer?: { id?: string; isAdmin: boolean },
): PartnerFavoriteItem[] => {
  const allowed = new Set(allowedUserIds);
  const items: PartnerFavoriteItem[] = [];

  for (const [assetId, marks] of Object.entries(store.favorites)) {
    const favoritedBy = Object.entries(marks)
      .filter(
        ([userId]) =>
          Boolean(viewer?.isAdmin) || (allowed.has(userId) && isSharedFavoriteVisible(store, userId, viewer)),
      )
      .map(([userId, mark]) => ({ user: store.users[userId], favoritedAt: mark.favoritedAt }))
      .filter((entry): entry is { user: PartnerFavoriteUser; favoritedAt: string } => Boolean(entry.user));

    if (favoritedBy.length === 0) {
      continue;
    }

    items.push({
      assetId,
      favoritedAt: favoritedBy.reduce(
        (latest, entry) => (entry.favoritedAt > latest ? entry.favoritedAt : latest),
        favoritedBy[0].favoritedAt,
      ),
      favoritedBy: favoritedBy.map((entry) => entry.user),
    });
  }

  return items.sort((a, b) => b.favoritedAt.localeCompare(a.favoritedAt));
};
