import { json } from './_lib/email.js';
import {
  verifyAdminSession,
  verifyAdminSessionFromRequest,
  type ImmichUser,
} from './_lib/immich-auth.js';
import {
  addBlockedUser,
  getBlockedUsersStorage,
  isUserBlocked,
  listBlockedUsers,
  removeBlockedUser,
} from './_lib/blocked-users-store.js';

export const config = {
  runtime: 'edge',
};

type BlockUserBody = {
  userId?: string;
  action?: 'block' | 'unblock';
  list?: boolean;
};

const parseBody = async (request: Request): Promise<BlockUserBody | null> => {
  try {
    const text = await request.text();
    if (!text) {
      return {};
    }

    return JSON.parse(text) as BlockUserBody;
  } catch {
    return null;
  }
};

const resolveAdmin = async (request: Request, accessToken?: string): Promise<ImmichUser | null> => {
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const token = bearer || accessToken?.trim() || undefined;
  const cookie = request.headers.get('cookie') ?? undefined;

  return (
    (await verifyAdminSession(token, cookie)) ?? (await verifyAdminSessionFromRequest(request, token))
  );
};

const listResponse = async (request: Request, accessToken?: string): Promise<Response> => {
  const admin = await resolveAdmin(request, accessToken);
  if (!admin) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const storage = getBlockedUsersStorage();
  try {
    const blockedUserIds = await listBlockedUsers();
    return json({
      ok: true,
      blockedUserIds,
      count: blockedUserIds.length,
      storage,
    });
  } catch (error) {
    console.error('[admin-block-user] list failed', error);
    return json(
      {
        error: 'Could not load blocked users',
        detail: error instanceof Error ? error.message : 'Unknown error',
        storage,
      },
      502,
    );
  }
};

const blockUserResponse = async (
  userId: string,
  accessToken?: string,
  cookie?: string,
): Promise<Response> => {
  const id = userId.trim();
  if (!id) {
    return json({ error: 'User ID is required' }, 400);
  }

  const admin = await verifyAdminSession(accessToken, cookie);
  if (!admin) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const result = await addBlockedUser(id);
    return json({
      ok: true,
      blocked: true,
      userId: id,
      persisted: result.persisted,
    });
  } catch (error) {
    console.error('[admin-block-user] block failed', error);
    return json(
      {
        error: 'Could not block user',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      503,
    );
  }
};

const unblockUserResponse = async (
  userId: string,
  accessToken?: string,
  cookie?: string,
): Promise<Response> => {
  const id = userId.trim();
  if (!id) {
    return json({ error: 'User ID is required' }, 400);
  }

  const admin = await verifyAdminSession(accessToken, cookie);
  if (!admin) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const result = await removeBlockedUser(id);
    return json({
      ok: true,
      blocked: false,
      userId: id,
      persisted: result.persisted,
    });
  } catch (error) {
    console.error('[admin-block-user] unblock failed', error);
    return json(
      {
        error: 'Could not unblock user',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      503,
    );
  }
};

/** POST /api/admin-block-user — khóa/mở khóa user hoặc list blocked users (admin only) */
export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'GET') {
    const url = new URL(request.url);
    if (url.searchParams.get('list') === '1') {
      return listResponse(request, url.searchParams.get('accessToken') ?? undefined);
    }

    return json({ error: 'Method not allowed' }, 405);
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const body = await parseBody(request);
  if (!body) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (body.list) {
    return listResponse(request, body.accessToken);
  }

  const userId = body.userId ?? '';
  const action = body.action ?? 'block';
  const cookie = request.headers.get('cookie') ?? undefined;

  if (action === 'block') {
    return blockUserResponse(userId, body.accessToken, cookie);
  }

  if (action === 'unblock') {
    return unblockUserResponse(userId, body.accessToken, cookie);
  }

  return json({ error: 'Invalid action' }, 400);
}
