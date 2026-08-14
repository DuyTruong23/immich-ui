import { verifyAdminSession } from './_lib/immich-auth.js';
import {
  DEFAULT_FEATURE_UPDATES,
  compareFeatureUpdateVersion,
  normalizeFeatureUpdatesConfig,
  type FeatureUpdatesConfig,
} from './_lib/feature-updates-config.js';
import { notifyFeatureUpdateSubscribers } from './_lib/feature-update-notify.js';
import { readFeatureUpdatesConfig, writeFeatureUpdatesConfig } from './_lib/feature-updates-store.js';
import { json } from './_lib/email.js';

/** Edge — Node.js functions không được invoke trên static+middleware; Blob dùng fetch, không SDK. */
export const config = {
  runtime: 'edge',
};

type FeatureUpdatesBody = {
  accessToken?: string;
  version?: string;
  items?: unknown[];
};

const parseBody = async (request: Request): Promise<FeatureUpdatesBody | null> => {
  try {
    const text = await request.text();
    if (!text) {
      return {};
    }

    return JSON.parse(text) as FeatureUpdatesBody;
  } catch {
    return null;
  }
};

/** GET/PUT /api/feature-updates — đọc/ghi nội dung modal tính năng mới */
export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'GET') {
    try {
      const config = await readFeatureUpdatesConfig();
      return json(config);
    } catch (error) {
      console.error('[feature-updates] read failed', error);
      return json(DEFAULT_FEATURE_UPDATES);
    }
  }

  if (request.method === 'PUT') {
    const body = await parseBody(request);
    if (!body) {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const admin = await verifyAdminSession(body.accessToken, request.headers.get('cookie') ?? undefined);
    if (!admin) {
      return json({ error: 'Admin authentication required' }, 401);
    }

    const previous = await readFeatureUpdatesConfig();
    const nextConfig = normalizeFeatureUpdatesConfig({
      version: body.version,
      items: body.items,
      releases: previous.releases,
    });

    if (!nextConfig) {
      return json({ error: 'Version and at least one feature item are required' }, 400);
    }

    try {
      await writeFeatureUpdatesConfig(nextConfig);
    } catch (error) {
      console.error('[feature-updates] write failed', error);
      return json(
        {
          error: 'Feature updates storage is not configured',
          detail: error instanceof Error ? error.message : 'Unknown error',
        },
        503,
      );
    }

    if (compareFeatureUpdateVersion(nextConfig.version, previous.version) > 0) {
      try {
        await notifyFeatureUpdateSubscribers(nextConfig);
      } catch (error) {
        console.error('[feature-updates] notify failed', error);
      }
    }

    return json(nextConfig satisfies FeatureUpdatesConfig);
  }

  return json({ error: 'Method not allowed' }, 405);
}
