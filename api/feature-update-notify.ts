import { getEnv, json } from './_lib/email.js';
import { normalizeFeatureUpdatesConfig } from './_lib/feature-updates-config.js';
import { notifyFeatureUpdateSubscribers } from './_lib/feature-update-notify.js';
import { readFeatureUpdatesConfig } from './_lib/feature-updates-store.js';
import { verifyAdminSession } from './_lib/immich-auth.js';

export const config = {
  runtime: 'edge',
};

type NotifyBody = {
  secret?: string;
  accessToken?: string;
  version?: string;
  items?: unknown[];
  force?: boolean;
};

const hasValidSecret = (request: Request, bodySecret?: string): boolean => {
  const expected = getEnv('FEATURE_UPDATE_NOTIFY_SECRET');
  if (!expected) {
    return false;
  }

  const header = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  return header === expected || bodySecret === expected;
};

/** POST /api/feature-update-notify — admin hoặc secret gửi changelog tới subscriber */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: NotifyBody = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text) as NotifyBody;
    }
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const admin = await verifyAdminSession(body.accessToken, request.headers.get('cookie') ?? undefined);
  if (!hasValidSecret(request, body.secret) && !admin) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const config =
    normalizeFeatureUpdatesConfig({ version: body.version, items: body.items }) ??
    (await readFeatureUpdatesConfig());

  try {
    const result = await notifyFeatureUpdateSubscribers(config, {
      force: Boolean(body.force),
      accessToken: body.accessToken,
      cookie: request.headers.get('cookie') ?? undefined,
    });
    return json({ ok: true, ...result, version: config.version });
  } catch (error) {
    console.error('[feature-update-notify]', error);
    return json(
      {
        error: 'Failed to notify subscribers',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      502,
    );
  }
}
