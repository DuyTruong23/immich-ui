import { json } from './_lib/email.js';
import { verifySession, type ImmichUser } from './_lib/immich-auth.js';
import { notifyPartnerFavorite } from './_lib/partner-favorite-notify.js';
import {
  buildFavoriteItems,
  isAssetId,
  isShareWithEveryone,
  normalizeFavoriteUser,
  readPartnerFavorites,
  setShareWithEveryone,
  setUserFavorite,
  syncUserImmichFavorites,
  upsertFavoriteUser,
  writePartnerFavorites,
  type PartnerFavoriteUser,
} from './_lib/partner-favorites-store.js';

export const config = {
  runtime: 'edge',
};

const DEFAULT_UPSTREAM = 'https://immich.gallery-app.pp.ua';

type PartnerRecord = {
  id?: string;
  email?: string;
  name?: string;
  avatarColor?: string;
  profileImagePath?: string;
  profileChangedAt?: string;
};

const getUpstreamBase = (): string => {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return (env?.IMMICH_SERVER_URL ?? DEFAULT_UPSTREAM).replace(/\/$/, '');
};

const toFavoriteUser = (user: ImmichUser, extra?: Partial<PartnerFavoriteUser>): PartnerFavoriteUser =>
  normalizeFavoriteUser({
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    avatarColor: extra?.avatarColor ?? 'primary',
    profileImagePath: extra?.profileImagePath ?? '',
    profileChangedAt: extra?.profileChangedAt ?? new Date().toISOString(),
  }) ?? {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    avatarColor: 'primary',
    profileImagePath: '',
    profileChangedAt: new Date().toISOString(),
  };

const authHeaders = (accessToken?: string, cookieHeader?: string): Record<string, string> | null => {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = accessToken?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  const cookie = cookieHeader?.trim();
  if (cookie) {
    headers.Cookie = cookie;
    return headers;
  }

  return null;
};

const fetchPartners = async (
  accessToken?: string,
  cookieHeader?: string,
): Promise<PartnerFavoriteUser[]> => {
  const headers = authHeaders(accessToken, cookieHeader);
  if (!headers) {
    return [];
  }

  const base = getUpstreamBase();
  const results = await Promise.all(
    ['shared-by', 'shared-with'].map(async (direction) => {
      try {
        const response = await fetch(`${base}/api/partners?direction=${direction}`, { headers });
        if (!response.ok) {
          return [] as PartnerFavoriteUser[];
        }

        const partners = (await response.json()) as PartnerRecord[];
        return partners
          .map((partner) =>
            normalizeFavoriteUser({
              id: partner.id,
              name: partner.name,
              email: partner.email,
              isAdmin: false,
              avatarColor: partner.avatarColor,
              profileImagePath: partner.profileImagePath,
              profileChangedAt: partner.profileChangedAt,
            }),
          )
          .filter((partner): partner is PartnerFavoriteUser => partner !== null);
      } catch (error) {
        console.error('[partner-favorites] fetch partners failed', direction, error);
        return [] as PartnerFavoriteUser[];
      }
    }),
  );

  const unique = new Map<string, PartnerFavoriteUser>();
  for (const partner of results.flat()) {
    unique.set(partner.id, partner);
  }
  return [...unique.values()];
};

const parseAccessToken = (body: { accessToken?: string } | undefined): string | undefined =>
  body?.accessToken?.trim() || undefined;

type StoreShape = Awaited<ReturnType<typeof readPartnerFavorites>>;

const jsonPayload = (
  me: PartnerFavoriteUser,
  partners: PartnerFavoriteUser[],
  store: StoreShape,
  extra?: Record<string, unknown>,
) =>
  json({
    me,
    partners,
    shareWithEveryone: isShareWithEveryone(store, me.id),
    items: buildFavoriteItems(store, [me.id, ...partners.map((partner) => partner.id)], {
      isAdmin: me.isAdmin,
    }),
    ...extra,
  });

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (
    request.method !== 'GET' &&
    request.method !== 'POST' &&
    request.method !== 'PUT' &&
    request.method !== 'PATCH'
  ) {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: {
    accessToken?: string;
    assetId?: string;
    favorite?: boolean;
    assetIds?: unknown;
    shareWithEveryone?: unknown;
  } = {};
  if (request.method !== 'GET') {
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text) as typeof body;
      }
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }
  }

  const cookie = request.headers.get('cookie') ?? undefined;
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const accessToken = parseAccessToken(body) || bearer || undefined;
  const user = await verifySession(accessToken, cookie);
  if (!user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const partners = await fetchPartners(accessToken, cookie);
  const me = toFavoriteUser(user);
  let store = upsertFavoriteUser(await readPartnerFavorites(), me);
  for (const partner of partners) {
    store = upsertFavoriteUser(store, partner);
  }

  if (request.method === 'GET') {
    return jsonPayload(me, partners, store);
  }

  if (request.method === 'PATCH') {
    if (typeof body.shareWithEveryone !== 'boolean') {
      return json({ error: 'shareWithEveryone must be a boolean' }, 400);
    }

    store = setShareWithEveryone(store, me.id, body.shareWithEveryone);
    await writePartnerFavorites(store);
    return jsonPayload(me, partners, store, { ok: true });
  }

  if (request.method === 'PUT') {
    const assetIds = Array.isArray(body.assetIds)
      ? body.assetIds.filter((id): id is string => typeof id === 'string' && isAssetId(id))
      : null;
    if (!assetIds) {
      return json({ error: 'assetIds must be an array of asset ids' }, 400);
    }

    store = syncUserImmichFavorites(store, me.id, assetIds);
    await writePartnerFavorites(store);
    return jsonPayload(me, partners, store, { ok: true, synced: assetIds.length });
  }

  const singleId = typeof body.assetId === 'string' ? body.assetId.trim() : '';
  const bulkIds = Array.isArray(body.assetIds)
    ? body.assetIds.filter((id): id is string => typeof id === 'string' && isAssetId(id))
    : [];
  const assetIds = bulkIds.length > 0 ? bulkIds : singleId && isAssetId(singleId) ? [singleId] : [];
  if (assetIds.length === 0) {
    return json({ error: 'Valid assetId is required' }, 400);
  }

  const favorite = Boolean(body.favorite);
  const addedIds: string[] = [];
  let added = false;
  let removed = false;

  for (const assetId of assetIds) {
    const result = setUserFavorite(store, assetId, me.id, favorite, 'overlay');
    store = result.store;
    added = added || result.added;
    removed = removed || result.removed;
    if (result.added) {
      addedIds.push(assetId);
    }
  }

  await writePartnerFavorites(store);

  let emailed = 0;
  if (addedIds.length > 0 && isShareWithEveryone(store, me.id)) {
    const bothFavorited = addedIds.some((assetId) => {
      const item = buildFavoriteItems(
        store,
        [me.id, ...partners.map((partner) => partner.id)],
        { isAdmin: true },
      ).find((entry) => entry.assetId === assetId);
      return (item?.favoritedBy.length ?? 0) > 1;
    });
    const notify = await notifyPartnerFavorite({
      actor: me,
      recipients: partners,
      bothFavorited,
    });
    emailed = notify.sent;
  }

  return jsonPayload(me, partners, store, {
    ok: true,
    assetId: assetIds[0],
    favorite,
    added,
    removed,
    emailed,
  });
}
