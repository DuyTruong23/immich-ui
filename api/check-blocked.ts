import { json } from './_lib/email.js';
import { verifySession, type ImmichUser } from './_lib/immich-auth.js';
import { isUserBlocked } from './_lib/blocked-users-store.js';

export const config = {
  runtime: 'edge',
};

type CheckBlockedBody = {
  userId?: string;
};

const parseBody = async (request: Request): Promise<CheckBlockedBody | null> => {
  try {
    const text = await request.text();
    if (!text) {
      return {};
    }

    return JSON.parse(text) as CheckBlockedBody;
  } catch {
    return null;
  }
};

/** POST /api/check-blocked — check if user is blocked (auth required) */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const body = await parseBody(request);
  const bodyUserId = body?.userId?.trim();

  const cookie = request.headers.get('cookie') ?? undefined;
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const sessionUser = await verifySession(bearer, cookie);

  const userId = bodyUserId ?? sessionUser?.id;

  if (!userId) {
    return json({ error: 'User ID is required' }, 400);
  }

  try {
    const blocked = await isUserBlocked(userId);
    return json({
      ok: true,
      blocked,
      userId,
    });
  } catch (error) {
    console.error('[check-blocked] check failed', error);
    return json(
      {
        error: 'Could not check user status',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      503,
    );
  }
}
