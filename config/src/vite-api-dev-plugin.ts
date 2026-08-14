import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, ViteDevServer } from 'vite';

const rootDir = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const LOCAL_FEATURE_UPDATES_PATH = path.join(rootDir, '.data/feature-updates/config.json');

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

/** Vercel serverless routes handled locally during Vite dev (not proxied to Immich). */
export const DEV_API_ROUTES = ['/api/feature-updates', '/api/notify-login'] as const;

const DEV_API_HANDLERS: Record<string, string> = {
  '/api/feature-updates': path.resolve(rootDir, 'api/feature-updates.ts'),
  '/api/notify-login': path.resolve(rootDir, 'api/notify-login.ts'),
};

export const isDevApiRoute = (url?: string): boolean => {
  const pathname = url?.split('?')[0];
  return pathname !== undefined && pathname in DEV_API_HANDLERS;
};

/** Proxy context: match /api/* except local dev serverless routes. */
export const immichApiProxyPattern =
  '^/api/(?!feature-updates(?:[/?]|$)|notify-login(?:[/?]|$)|notify-deploy(?:[/?]|$)|feedback(?:[/?]|$))';

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
      const [{ verifyAdminSession }, { normalizeFeatureUpdatesConfig }, { json }] = await Promise.all([
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

      const nextConfig = normalizeFeatureUpdatesConfig({
        version: parsedBody.version,
        items: parsedBody.items,
      });
      if (!nextConfig) {
        await sendResponse(json({ error: 'Version and at least one feature item are required' }, 400), response);
        return true;
      }

      writeLocalFeatureUpdatesConfig(nextConfig);
      await sendResponse(json(nextConfig), response);
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
