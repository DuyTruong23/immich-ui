const DEFAULT_UPSTREAM = 'https://immich.gallery-app.pp.ua';

const getUpstreamBase = (): string => {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return (env?.IMMICH_SERVER_URL ?? DEFAULT_UPSTREAM).replace(/\/$/, '');
};

export const config = {
  // Bỏ qua các route serverless riêng — không proxy sang Immich
  matcher: ['/api/:path((?!notify-login$|notify-deploy$|feedback$|feature-updates$).*)'],
};

/** Chạy trước static/rewrites — proxy /api → Immich tunnel */
export default async function middleware(request: Request): Promise<Response> {
  const upstreamBase = getUpstreamBase();
  const url = new URL(request.url);
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
