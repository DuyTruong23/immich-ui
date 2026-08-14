import { getEnv } from './email.js';

const DEFAULT_UPSTREAM = 'https://immich.gallery-app.pp.ua';

export type ImmichUser = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  avatarColor?: string;
  profileImagePath?: string;
  profileChangedAt?: string;
};

const getUpstreamBase = (): string => (getEnv('IMMICH_SERVER_URL') ?? DEFAULT_UPSTREAM).replace(/\/$/, '');

const isLocalDevRuntime = (): boolean => getEnv('VERCEL') !== '1';

const AUTH_TIMEOUT_MS = 5000;
const USERS_TIMEOUT_MS = 8000;
const ACCOUNT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ImmichAccountUser = {
  id: string;
  email: string;
  name: string;
};

const LOCAL_DEV_ACCOUNT_USERS: ImmichAccountUser[] = [
  { id: 'dev-admin', email: 'dev-admin@local.ui', name: 'Dev Admin' },
  { id: 'dev-user', email: 'dev-user@local.ui', name: 'Dev User' },
];

const isValidAccountEmail = (value: string): boolean => ACCOUNT_EMAIL_RE.test(value);

const normalizeAccountUser = (value: unknown): ImmichAccountUser | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (record.deletedAt) {
    return null;
  }

  const email = typeof record.email === 'string' ? record.email.trim().toLowerCase() : '';
  if (!isValidAccountEmail(email)) {
    return null;
  }

  const id = typeof record.id === 'string' ? record.id : email;
  const name = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : email;
  return { id, email, name };
};

const fetchImmichAdminUsers = async (headers: Record<string, string>): Promise<ImmichAccountUser[] | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), USERS_TIMEOUT_MS);
  try {
    const response = await fetch(`${getUpstreamBase()}/api/admin/users?withDeleted=false`, {
      headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    const rows = Array.isArray(payload) ? payload : [];
    const users = new Map<string, ImmichAccountUser>();
    for (const row of rows) {
      const user = normalizeAccountUser(row);
      if (user) {
        users.set(user.email, user);
      }
    }

    return [...users.values()];
  } catch (error) {
    console.error('[immich-auth] listImmichAccountUsers failed:', error);
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/** Email trên tài khoản Immich — nguồn danh sách nhận changelog. */
export const listImmichAccountUsers = async (options?: {
  accessToken?: string;
  cookie?: string;
}): Promise<ImmichAccountUser[]> => {
  const token = options?.accessToken?.trim();
  const cookie = options?.cookie?.trim();
  const apiKey = getEnv('IMMICH_API_KEY');

  if (token) {
    const users = await fetchImmichAdminUsers({
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    });
    if (users) {
      return users;
    }
  }

  if (cookie) {
    const users = await fetchImmichAdminUsers({
      Accept: 'application/json',
      Cookie: cookie,
    });
    if (users) {
      return users;
    }
  }

  if (apiKey) {
    const users = await fetchImmichAdminUsers({
      Accept: 'application/json',
      'x-api-key': apiKey,
    });
    if (users) {
      return users;
    }
  }

  if (isLocalDevRuntime()) {
    return LOCAL_DEV_ACCOUNT_USERS;
  }

  throw new Error('Could not load Immich user emails');
};

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
