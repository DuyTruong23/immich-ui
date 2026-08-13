import { getEnv } from './email';

const DEFAULT_UPSTREAM = 'https://immich.gallery-app.pp.ua';

export type ImmichUser = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

const getUpstreamBase = (): string => (getEnv('IMMICH_SERVER_URL') ?? DEFAULT_UPSTREAM).replace(/\/$/, '');

const isLocalDevRuntime = (): boolean => getEnv('VERCEL') !== '1';

export const verifySession = async (accessToken?: string, cookieHeader?: string): Promise<ImmichUser | null> => {
  const token = accessToken?.trim();
  if (token) {
    const response = await fetch(`${getUpstreamBase()}/api/users/me`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      return (await response.json()) as ImmichUser;
    }
  }

  const cookies = cookieHeader?.trim();
  if (cookies) {
    const response = await fetch(`${getUpstreamBase()}/api/users/me`, {
      headers: {
        Accept: 'application/json',
        Cookie: cookies,
      },
    });

    if (response.ok) {
      return (await response.json()) as ImmichUser;
    }
  }

  return null;
};

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
    return {
      id: 'dev-admin',
      email: 'dev-admin@local',
      name: 'Dev Admin',
      isAdmin: true,
    };
  }

  return null;
};
