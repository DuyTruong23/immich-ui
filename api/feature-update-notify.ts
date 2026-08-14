import { getEnv, json } from './_lib/email.js';
import { normalizeFeatureUpdatesConfig } from './_lib/feature-updates-config.js';
import { notifyFeatureUpdateSubscribers } from './_lib/feature-update-notify.js';
import { readFeatureUpdatesConfig } from './_lib/feature-updates-store.js';

export const config = {
  runtime: 'edge',
};

const hasValidSecret = (request: Request, bodySecret?: string): boolean => {
  const expected = getEnv('FEATURE_UPDATE_NOTIFY_SECRET');
  if (!expected) {
    return false;
  }

  const header = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  return header === expected || bodySecret === expected;
};

/** POST /api/feature-update-notify — CI gọi sau khi publish version mới */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: { secret?: string; version?: string; items?: unknown[] } = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text) as typeof body;
    }
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!hasValidSecret(request, body.secret)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const config =
    normalizeFeatureUpdatesConfig({ version: body.version, items: body.items }) ??
    (await readFeatureUpdatesConfig());

  try {
    const result = await notifyFeatureUpdateSubscribers(config);
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
