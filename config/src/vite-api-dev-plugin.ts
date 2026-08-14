import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, ViteDevServer } from 'vite';

const rootDir = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const LOCAL_FEATURE_UPDATES_PATH = path.join(rootDir, '.data/feature-updates/config.json');
const LOCAL_SUBSCRIBERS_PATH = path.join(rootDir, '.data/feature-updates/subscribers.json');

const readLocalFeatureUpdatesConfig = (): unknown | null => {
  try {
    const raw = fs.readFileSync(LOCAL_FEATURE_UPDATES_PATH, 'utf8');
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

const writeLocalFeatureUpdatesConfig = (config: unknown): void => {
  fs.mkdirSync(path.dirname(LOCAL_FEATURE_UPDATES_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_FEATURE_UPDATES_PATH, JSON.stringify(config, null, 2), 'utf8');
};

const readLocalSubscribers = (): { emails: string[]; lastNotifiedVersion?: string } => {
  try {
    const raw = JSON.parse(fs.readFileSync(LOCAL_SUBSCRIBERS_PATH, 'utf8')) as {
      emails?: unknown;
      lastNotifiedVersion?: string;
    };
    const emails = Array.isArray(raw.emails)
      ? raw.emails.filter((email): email is string => typeof email === 'string')
      : [];
    return raw.lastNotifiedVersion ? { emails, lastNotifiedVersion: raw.lastNotifiedVersion } : { emails };
  } catch {
    return { emails: [] };
  }
};

const writeLocalSubscribers = (store: { emails: string[]; lastNotifiedVersion?: string }): void => {
  fs.mkdirSync(path.dirname(LOCAL_SUBSCRIBERS_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_SUBSCRIBERS_PATH, JSON.stringify(store, null, 2), 'utf8');
};

/** Vercel serverless routes handled locally during Vite dev (not proxied to Immich). */
export const DEV_API_ROUTES = [
  '/api/feature-updates',
  '/api/feature-update-subscribe',
  '/api/feature-update-notify',
  '/api/notify-login',
] as const;

const DEV_API_HANDLERS: Record<string, string> = {
  '/api/feature-updates': path.resolve(rootDir, 'api/feature-updates.ts'),
  '/api/feature-update-subscribe': path.resolve(rootDir, 'api/feature-update-subscribe.ts'),
  '/api/feature-update-notify': path.resolve(rootDir, 'api/feature-update-notify.ts'),
  '/api/notify-login': path.resolve(rootDir, 'api/notify-login.ts'),
};

export const isDevApiRoute = (url?: string): boolean => {
  const pathname = url?.split('?')[0];
  return pathname !== undefined && pathname in DEV_API_HANDLERS;
};

/** Proxy context: match /api/* except local dev serverless routes. */
export const immichApiProxyPattern =
  '^/api/(?!feature-updates(?:[/?]|$)|feature-update-subscribe(?:[/?]|$)|feature-update-notify(?:[/?]|$)|notify-login(?:[/?]|$)|notify-deploy(?:[/?]|$)|feedback(?:[/?]|$))';

const readRequestBody = (request: IncomingMessage): Promise<Uint8Array | undefined> =>
  new Promise((resolve, reject) => {
    if (request.method === 'GET' || request.method === 'HEAD') {
      resolve(undefined);
      return;
    }

    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => resolve(chunks.length > 0 ? Buffer.concat(chunks) : undefined));
    request.on('error', reject);
  });

const sendResponse = async (response: Response, res: ServerResponse): Promise<void> => {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.end(Buffer.from(await response.arrayBuffer()));
};

const handleDevApi = async (
  server: ViteDevServer,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<boolean> => {
  const pathname = request.url?.split('?')[0];
  const handlerPath = pathname ? DEV_API_HANDLERS[pathname] : undefined;

  if (!handlerPath || !fs.existsSync(handlerPath)) {
    return false;
  }

  try {
    const host = request.headers.host ?? '127.0.0.1';
    const url = `http://${host}${request.url ?? pathname}`;
    const body = await readRequestBody(request);
    const headers = new Headers();

    for (const [key, value] of Object.entries(request.headers)) {
      if (value === undefined) {
        continue;
      }

      headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    }

    const init: RequestInit & { duplex?: 'half' } = {
      method: request.method,
      headers,
    };

    if (body !== undefined) {
      init.body = body;
      init.duplex = 'half';
    }

    const webRequest = new Request(url, init);

    if (pathname === '/api/feature-updates' && request.method === 'GET') {
      const [{ normalizeFeatureUpdatesConfig, DEFAULT_FEATURE_UPDATES, compareFeatureUpdateVersion }, { json }] =
        await Promise.all([
          server.ssrLoadModule(path.resolve(rootDir, 'api/_lib/feature-updates-config.ts')),
          server.ssrLoadModule(path.resolve(rootDir, 'api/_lib/email.ts')),
        ]);
      const localConfig = normalizeFeatureUpdatesConfig(readLocalFeatureUpdatesConfig());
      if (
        localConfig &&
        compareFeatureUpdateVersion(localConfig.version, DEFAULT_FEATURE_UPDATES.version) >= 0
      ) {
        await sendResponse(json(localConfig), response);
        return true;
      }
    }

    if (pathname === '/api/feature-updates' && request.method === 'PUT') {
      const [{ verifyAdminSession }, { normalizeFeatureUpdatesConfig, DEFAULT_FEATURE_UPDATES }, { json }] = await Promise.all([
        server.ssrLoadModule(path.resolve(rootDir, 'api/_lib/immich-auth.ts')),
        server.ssrLoadModule(path.resolve(rootDir, 'api/_lib/feature-updates-config.ts')),
        server.ssrLoadModule(path.resolve(rootDir, 'api/_lib/email.ts')),
      ]);

      let parsedBody: { accessToken?: string; version?: string; items?: string[] } = {};
      try {
        const text = body ? Buffer.from(body).toString('utf8') : '';
        if (text) {
          parsedBody = JSON.parse(text) as typeof parsedBody;
        }
      } catch {
        await sendResponse(json({ error: 'Invalid JSON body' }, 400), response);
        return true;
      }

      const admin = await verifyAdminSession(
        parsedBody.accessToken,
        request.headers.cookie ?? undefined,
      );
      if (!admin) {
        await sendResponse(json({ error: 'Admin authentication required' }, 401), response);
        return true;
      }

      const previous =
        normalizeFeatureUpdatesConfig(readLocalFeatureUpdatesConfig()) ?? DEFAULT_FEATURE_UPDATES;
      const nextConfig = normalizeFeatureUpdatesConfig({
        version: parsedBody.version,
        items: parsedBody.items,
        releases: previous.releases,
      });
      if (!nextConfig) {
        await sendResponse(json({ error: 'Version and at least one feature item are required' }, 400), response);
        return true;
      }

      writeLocalFeatureUpdatesConfig(nextConfig);
      await sendResponse(json(nextConfig), response);
      return true;
    }

    if (pathname === '/api/feature-update-subscribe') {
      const { json } = await server.ssrLoadModule(path.resolve(rootDir, 'api/_lib/email.ts'));
      const url = new URL(request.url ?? pathname, `http://${request.headers.host ?? '127.0.0.1'}`);
      const isUnsubscribeGet = request.method === 'GET' && url.searchParams.get('unsubscribe') === '1';

      let email = url.searchParams.get('email') ?? '';
      let unsubscribe = isUnsubscribeGet;
      let version: string | undefined;

      if (request.method === 'POST') {
        try {
          const text = body ? Buffer.from(body).toString('utf8') : '';
          const parsed = text ? (JSON.parse(text) as { email?: string; unsubscribe?: boolean; version?: string }) : {};
          email = parsed.email ?? email;
          unsubscribe = Boolean(parsed.unsubscribe);
          version = parsed.version;
        } catch {
          await sendResponse(json({ error: 'Invalid JSON body' }, 400), response);
          return true;
        }
      } else if (!isUnsubscribeGet) {
        await sendResponse(json({ error: 'Method not allowed' }, 405), response);
        return true;
      }

      const normalized = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        await sendResponse(json({ error: 'Valid email is required' }, 400), response);
        return true;
      }

      const store = readLocalSubscribers();
      if (unsubscribe) {
        writeLocalSubscribers({
          ...store,
          emails: store.emails.filter((item) => item !== normalized),
        });
        await sendResponse(json({ ok: true, unsubscribed: store.emails.includes(normalized) }), response);
        return true;
      }

      const exists = store.emails.includes(normalized);
      writeLocalSubscribers({
        emails: exists ? store.emails : [...store.emails, normalized],
        lastNotifiedVersion: store.lastNotifiedVersion ?? version,
      });
      console.info('[vite-api-dev] feature-update subscribe', normalized);
      await sendResponse(json({ ok: true, added: !exists }), response);
      return true;
    }

    if (pathname === '/api/feature-update-notify' && request.method === 'POST') {
      const { json } = await server.ssrLoadModule(path.resolve(rootDir, 'api/_lib/email.ts'));
      console.info('[vite-api-dev] feature-update notify skipped in local dev');
      await sendResponse(json({ ok: true, skipped: true, reason: 'dev', sent: 0 }), response);
      return true;
    }

    const module = await server.ssrLoadModule(handlerPath);
    const handler = module.default as (req: Request) => Promise<Response>;

    if (typeof handler !== 'function') {
      throw new Error(`Missing default handler export in ${handlerPath}`);
    }

    await sendResponse(await handler(webRequest), response);
    return true;
  } catch (error) {
    console.error('[vite-api-dev]', pathname, error);
    response.statusCode = 500;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ error: 'Internal server error' }));
    return true;
  }
};

/** Serve selected /api/* routes from repo api/ folder during Vite dev. */
export const viteApiDevPlugin = (): Plugin => ({
  name: 'vite-api-dev',
  enforce: 'pre',
  configureServer(server) {
    // Must run before Vite's /api proxy (Vite 8 bypass(null) still proxies).
    server.middlewares.use((request, response, next) => {
      void handleDevApi(server, request, response).then((handled) => {
        if (!handled) {
          next();
        }
      });
    });
  },
});
