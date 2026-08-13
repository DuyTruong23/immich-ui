import { getEnv } from './email.js';

const DEFAULT_UPSTREAM = 'https://immich.gallery-app.pp.ua';

export type ImmichUser = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

const getUpstreamBase = (): string => (getEnv('IMMICH_SERVER_URL') ?? DEFAULT_UPSTREAM).replace(/\/$/, '');

const isLocalDevRuntime = (): boolean => getEnv('VERCEL') !== '1';

const AUTH_TIMEOUT_MS = 5000;

const fetchImmichUser = async (url: string, headers: Record<string, string>): Promise<ImmichUser | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as ImmichUser;
  } catch (error) {
    console.error('[immich-auth] fetchImmichUser failed:', error);
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/** Xác minh session qua cùng origin request (middleware proxy → Immich). */
export const verifySessionFromRequest = async (
  request: Request,
  accessToken?: string,
): Promise<ImmichUser | null> => {
  const meUrl = new URL('/api/users/me', request.url).toString();
  const headers: Record<string, string> = { Accept: 'application/json' };

  const token = accessToken?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    const cookie = request.headers.get('cookie');
    if (!cookie) {
      return null;
    }
    headers.Cookie = cookie;
  }

  try {
    const response = await fetch(meUrl, { headers });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as ImmichUser;
  } catch (error) {
    console.error('[immich-auth] verifySessionFromRequest failed:', error);
    return null;
  }
};

export const verifySession = async (accessToken?: string, cookieHeader?: string): Promise<ImmichUser | null> => {
  const token = accessToken?.trim();
  if (token) {
    const user = await fetchImmichUser(`${getUpstreamBase()}/api/users/me`, {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    });
    if (user) {
      return user;
    }
  }

  const cookies = cookieHeader?.trim();
  if (cookies) {
    const user = await fetchImmichUser(`${getUpstreamBase()}/api/users/me`, {
      Accept: 'application/json',
      Cookie: cookies,
    });
    if (user) {
      return user;
    }
  }

  return null;
};

const devAdminUser = (): ImmichUser => ({
  id: 'dev-admin',
  email: 'dev-admin@local',
  name: 'Dev Admin',
  isAdmin: true,
});

export const verifyAdminSession = async (
  accessToken?: string,
  cookieHeader?: string,
): Promise<ImmichUser | null> => {
  const user = await verifySession(accessToken, cookieHeader);
  if (user?.isAdmin) {
    return user;
  }

  // Vite dev: allow admin save to local .data file when Immich session unavailable.
  if (isLocalDevRuntime()) {
    return devAdminUser();
  }

  return null;
};

export const verifyAdminSessionFromRequest = async (
  request: Request,
  accessToken?: string,
): Promise<ImmichUser | null> => {
  const user = await verifySessionFromRequest(request, accessToken);
  if (user?.isAdmin) {
    return user;
  }

  if (isLocalDevRuntime()) {
    return devAdminUser();
  }

  return null;
};
