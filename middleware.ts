const DEFAULT_UPSTREAM = 'https://immich.gallery-app.pp.ua';

const LOCAL_API_PATHS = new Set([
  '/api/notify-login',
  '/api/notify-deploy',
  '/api/feedback',
  '/api/feature-updates',
]);

const getUpstreamBase = (): string => {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return (env?.IMMICH_SERVER_URL ?? DEFAULT_UPSTREAM).replace(/\/$/, '');
};

export const config = {
  matcher: ['/api/:path*'],
};

/** Chạy trước static/rewrites — proxy /api → Immich, trừ route serverless local */
export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  if (LOCAL_API_PATHS.has(url.pathname)) {
    return;
  }

  const upstreamBase = getUpstreamBase();
  const targetUrl = `${upstreamBase}${url.pathname}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const body = await request.arrayBuffer();
    if (body.byteLength > 0) {
      init.body = body;
    }
  }

  return fetch(targetUrl, init);
}
